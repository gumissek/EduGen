"""ZPE curriculum scraper service.

Crawls https://zpe.gov.pl/podstawa-programowa two levels deep:
  Level 1 — education-stage pages (e.g. szkola-podstawowa, liceum …)
  Level 2 — individual subject pages (e.g. jezyk-polski, matematyka …)

For every subject page the HTML parser (parse_zpe_url_to_chunks) is used to
extract curriculum requirements.  New or changed content is stored as
CurriculumDocument + CurriculumChunk rows with vector embeddings (via
OpenRouter).  Unchanged content is served from the content-hash cache
(no embedding API call needed).

Entry points
------------
run_zpe_scraper(db_factory)
    Full crawl — called at application startup (init_app.py) and scheduled
    daily by the APScheduler job registered in main.py.
"""

from __future__ import annotations

import hashlib
import logging
from datetime import datetime, timezone
from uuid import uuid4

import requests
from bs4 import BeautifulSoup
from sqlalchemy import text
from sqlalchemy.orm import Session as DBSession

from app.config import settings
from app.models.curriculum_chunk import CurriculumChunk
from app.models.curriculum_document import CurriculumDocument
from app.models.secret_key import SecretKey
from app.encryption import decrypt_api_key
from app.services.curriculum_service import (
    parse_zpe_url_to_chunks,
    generate_embeddings_batch,
    _compute_content_hash,
)

logger = logging.getLogger(__name__)

ZPE_BASE_URL = "https://zpe.gov.pl/podstawa-programowa"
_REQUEST_TIMEOUT = 30
_HEADERS = {"User-Agent": "EduGen/1.0 (curriculum scraper)"}

# Mapping of URL slug → human-readable education-level label
_STAGE_LABELS: dict[str, str] = {
    "edukacja-przedszkolna": "Edukacja przedszkolna",
    "edukacja-wczesnoszkolna": "Edukacja wczesnoszkolna",
    "szkola-podstawowa": "Szkoła podstawowa",
    "szkola-ponadpodstawowa": "Szkoła ponadpodstawowa",
    "branzowa-szkola-i-stopnia": "Branżowa szkoła I stopnia",
    "branzowa-szkola-ii-stopnia": "Branżowa szkoła II stopnia",
    "ksztalcenie-zawodowe": "Kształcenie zawodowe",
    "szkola-policealna": "Szkoła policealna",
}


class _PlaywrightPdfRenderer:
    """Render ZPE pages to PDF while reusing one browser and one page."""

    def __init__(self) -> None:
        self._playwright = None
        self._browser = None
        self._page = None
        self.available = False

    def __enter__(self) -> "_PlaywrightPdfRenderer":
        try:
            from playwright.sync_api import sync_playwright
        except ImportError:
            logger.warning("[zpe-scraper] Playwright not available — PDF export disabled.")
            return self

        try:
            self._playwright = sync_playwright().start()
            self._browser = self._playwright.chromium.launch(headless=True)
            self._page = self._browser.new_page()
            self.available = True
            return self
        except Exception as exc:
            logger.warning("[zpe-scraper] Failed to initialize Playwright: %s", exc)
            self.close()
            return self

    def __exit__(self, exc_type, exc, tb) -> None:  # noqa: ANN001
        self.close()

    def close(self) -> None:
        if self._page is not None:
            try:
                self._page.close()
            except Exception:
                pass
            self._page = None

        if self._browser is not None:
            try:
                self._browser.close()
            except Exception:
                pass
            self._browser = None

        if self._playwright is not None:
            try:
                self._playwright.stop()
            except Exception:
                pass
            self._playwright = None

        self.available = False

    def save_pdf(self, url: str, pdf_path: str) -> bool:
        if not self.available or self._page is None:
            return False

        try:
            self._page.goto(url, wait_until="networkidle", timeout=60_000)
            self._page.pdf(path=pdf_path, format="A4", print_background=True)
            return True
        except Exception as exc:
            logger.warning("[zpe-scraper] Failed to render PDF for %s: %s", url, exc)
            return False


def _slug_to_label(slug: str) -> str:
    """Convert a URL slug to a human-readable label."""
    if slug in _STAGE_LABELS:
        return _STAGE_LABELS[slug]
    return slug.replace("-", " ").title()


def _ensure_pdf_filename(filename: str) -> str:
    """Ensure the file name includes a PDF extension for browser downloads."""
    cleaned = (filename or "").strip()
    if not cleaned:
        return "document.pdf"
    if cleaned.lower().endswith(".pdf"):
        return cleaned
    return f"{cleaned}.pdf"


def _get_admin_api_key(db: DBSession) -> str | None:
    """Return the first active OpenRouter API key belonging to any superuser."""
    superuser_ids = [
        row[0]
        for row in db.execute(
            text("SELECT id FROM users WHERE is_superuser = true AND is_active = true LIMIT 5")
        ).fetchall()
    ]
    if not superuser_ids:
        logger.warning("[zpe-scraper] No active superusers found — cannot generate embeddings.")
        return None

    secret_key = (
        db.query(SecretKey)
        .filter(SecretKey.user_id.in_(superuser_ids), SecretKey.is_active == True)
        .first()
    )
    if not secret_key:
        logger.warning("[zpe-scraper] No active API key found for any superuser.")
        return None

    try:
        return decrypt_api_key(secret_key.secret_key_hash)
    except Exception as exc:
        logger.error("[zpe-scraper] Failed to decrypt API key: %s", exc)
        return None


# ── PDF helpers ──────────────────────────────────────────────────────────────

def _save_pdf_from_url(
    url: str,
    document_id: str,
    pdf_renderer: _PlaywrightPdfRenderer | None = None,
) -> str | None:
    """Generate a PDF of a ZPE curriculum page using Playwright and save it.

    Returns the absolute path of the saved PDF, or None if generation failed.
    """
    from pathlib import Path

    try:
        curriculum_dir = Path(settings.DATA_DIR) / "curriculum"
        doc_dir = curriculum_dir / document_id
        doc_dir.mkdir(parents=True, exist_ok=True)
        pdf_path = doc_dir / "original.pdf"

        if pdf_renderer and pdf_renderer.available:
            if not pdf_renderer.save_pdf(url, str(pdf_path)):
                return None
        else:
            with _PlaywrightPdfRenderer() as fallback_renderer:
                if not fallback_renderer.available:
                    logger.warning("[zpe-scraper] Playwright not available — PDF will not be saved for %s", url)
                    return None
                if not fallback_renderer.save_pdf(url, str(pdf_path)):
                    return None

        logger.info("[zpe-scraper] PDF saved: url=%s path=%s", url, pdf_path)
        return str(pdf_path)
    except Exception as exc:
        logger.warning("[zpe-scraper] Failed to save PDF for %s: %s", url, exc)
        return None


# ── Scraping helpers ──────────────────────────────────────────────────────────

def _get_stage_urls() -> list[tuple[str, str]]:
    """Fetch the ZPE base page and return (url, stage_slug) pairs."""
    logger.info("[zpe-scraper] Fetching stage list from: %s", ZPE_BASE_URL)
    try:
        resp = requests.get(ZPE_BASE_URL, timeout=_REQUEST_TIMEOUT, headers=_HEADERS)
        resp.raise_for_status()
    except Exception as exc:
        logger.error("[zpe-scraper] Failed to fetch ZPE base page: %s", exc)
        return []

    soup = BeautifulSoup(resp.text, "html.parser")
    pairs: list[tuple[str, str]] = []

    for item_div in soup.find_all("div", class_="stage-grid_item"):
        a_tag = item_div.find("a", class_="card")
        if a_tag and a_tag.get("href"):
            href: str = a_tag["href"]  # e.g. /podstawa-programowa/szkola-podstawowa
            slug = href.rstrip("/").split("/")[-1]
            full_url = f"https://zpe.gov.pl{href}"
            pairs.append((full_url, slug))

    logger.info("[zpe-scraper] Found %d education stages.", len(pairs))
    return pairs


def _get_subject_urls(stage_url: str, stage_slug: str) -> list[tuple[str, str, str]]:
    """Fetch a stage page and return (subject_url, subject_slug, stage_slug) triples."""
    logger.info("[zpe-scraper] Fetching subjects from stage: %s", stage_url)
    try:
        resp = requests.get(stage_url, timeout=_REQUEST_TIMEOUT, headers=_HEADERS)
        resp.raise_for_status()
    except Exception as exc:
        logger.warning("[zpe-scraper] Failed to fetch stage page %s: %s", stage_url, exc)
        return []

    soup = BeautifulSoup(resp.text, "html.parser")
    triples: list[tuple[str, str, str]] = []

    for item_div in soup.find_all("div", class_="stage-grid_item"):
        a_tag = item_div.find("a", class_=lambda c: c and "card" in c)
        if a_tag and a_tag.get("href"):
            href: str = a_tag["href"]
            subject_slug = href.rstrip("/").split("/")[-1]
            full_url = f"https://zpe.gov.pl{href}"
            triples.append((full_url, subject_slug, stage_slug))

    logger.info(
        "[zpe-scraper] Found %d subjects for stage %s.", len(triples), stage_slug
    )
    return triples


# ── Per-document processing ───────────────────────────────────────────────────

def _process_subject_url(
    db: DBSession,
    url: str,
    subject_slug: str,
    stage_slug: str,
    api_key: str | None,
    pdf_renderer: _PlaywrightPdfRenderer | None,
) -> None:
    """Parse one subject URL and upsert its chunks into the database."""
    education_level = _slug_to_label(stage_slug)
    subject_name = _slug_to_label(subject_slug)

    logger.info(
        "[zpe-scraper] Processing: url=%s subject=%s level=%s",
        url,
        subject_name,
        education_level,
    )

    # ── Parse HTML ────────────────────────────────────────────────────────────
    chunks_data = parse_zpe_url_to_chunks(
        url=url,
        subject_name=subject_name,
        education_level=education_level,
    )

    if not chunks_data:
        logger.warning("[zpe-scraper] No chunks parsed from %s — skipping.", url)
        return

    # ── Compute a stable document hash from all akapit texts ─────────────────
    combined_content = "\n".join(c["content"] for c in chunks_data)
    file_hash = hashlib.sha256(combined_content.encode("utf-8")).hexdigest()

    now = datetime.now(timezone.utc).isoformat()

    # ── Look up existing document by source_url ───────────────────────────────
    existing: CurriculumDocument | None = (
        db.query(CurriculumDocument)
        .filter(CurriculumDocument.source_url == url)
        .first()
    )

    if existing:
        if existing.file_hash == file_hash and existing.status == "ready":
            logger.info(
                "[zpe-scraper] Content unchanged — skipping: url=%s document_id=%s",
                url,
                existing.id,
            )
            return

        logger.info(
            "[zpe-scraper] Content changed or status!= ready — reprocessing: url=%s document_id=%s",
            url,
            existing.id,
        )
        existing.file_hash = file_hash
        existing.education_level = education_level
        existing.subject_name = subject_name
        existing.original_filename = _ensure_pdf_filename(f"{subject_name} - {education_level}")
        existing.description = existing.description or url
        existing.status = "processing"
        existing.error_message = None
        existing.updated_at = now
        db.commit()
        document = existing

        # Regenerate PDF if missing
        if not document.file_path:
            pdf_path = _save_pdf_from_url(url, document.id, pdf_renderer=pdf_renderer)
            if pdf_path:
                document.file_path = pdf_path
                document.filename = "original.pdf"
                db.commit()
    else:
        doc_id = str(uuid4())
        document = CurriculumDocument(
            id=doc_id,
            filename=f"{subject_slug}.html",
            original_filename=_ensure_pdf_filename(f"{subject_name} - {education_level}"),
            file_path=None,
            file_size=len(combined_content.encode("utf-8")),
            file_hash=file_hash,
            education_level=education_level,
            subject_name=subject_name,
            description=url,
            source_url=url,
            curriculum_year="2025/2026",
            status="processing",
            is_active=True,
            uploaded_by=None,
            created_at=now,
            updated_at=now,
        )
        db.add(document)
        db.commit()
        db.refresh(document)
        logger.info(
            "[zpe-scraper] New document created: document_id=%s url=%s",
            document.id,
            url,
        )

        # Generate and save PDF of the page
        pdf_path = _save_pdf_from_url(url, document.id, pdf_renderer=pdf_renderer)
        if pdf_path:
            document.file_path = pdf_path
            document.filename = "original.pdf"
            db.commit()

    try:
        _upsert_chunks_with_embeddings(db, document, chunks_data, api_key)
    except Exception as exc:
        logger.error(
            "[zpe-scraper] Failed to upsert chunks for %s: %s",
            url,
            exc,
            exc_info=True,
        )
        db.rollback()
        document = db.query(CurriculumDocument).filter(CurriculumDocument.id == document.id).first()
        if document:
            document.status = "error"
            document.error_message = str(exc)[:2000]
            document.updated_at = datetime.now(timezone.utc).isoformat()
            db.commit()


def _upsert_chunks_with_embeddings(
    db: DBSession,
    document: CurriculumDocument,
    chunks_data: list[dict],
    api_key: str | None,
) -> None:
    """Upsert chunks and generate missing embeddings for a document."""
    from sqlalchemy.dialects.postgresql import insert as pg_insert

    document_id = document.id
    now = datetime.now(timezone.utc).isoformat()

    # Compute content hashes (cache key = SHA-256 of akapit text)
    content_hashes = [_compute_content_hash(c["content"]) for c in chunks_data]
    unique_hashes = list(dict.fromkeys(content_hashes))

    # Query global embedding cache
    cached_rows = db.execute(
        text(
            """
            SELECT DISTINCT ON (content_hash)
                content_hash,
                id
            FROM curriculum_chunks
            WHERE content_hash = ANY(CAST(:hashes AS text[]))
              AND embedding IS NOT NULL
            ORDER BY content_hash, created_at DESC
            """
        ),
        {"hashes": unique_hashes},
    ).fetchall()
    cached_by_hash: dict[str, str] = {row[0]: row[1] for row in cached_rows}

    logger.info(
        "[zpe-scraper] Cache lookup: total_chunks=%d unique=%d cached=%d",
        len(chunks_data),
        len(unique_hashes),
        len(cached_by_hash),
    )

    # Delete existing chunks for this document
    db.execute(
        text("DELETE FROM curriculum_chunks WHERE document_id = :doc_id"),
        {"doc_id": document_id},
    )
    db.flush()

    # Insert all chunks (without embeddings first)
    chunk_objects: list[CurriculumChunk] = []
    for idx, chunk_data in enumerate(chunks_data):
        chunk_obj = CurriculumChunk(
            id=str(uuid4()),
            document_id=document_id,
            chunk_index=idx,
            content=chunk_data["content"],
            content_hash=content_hashes[idx],
            heading_hierarchy=chunk_data.get("heading_hierarchy"),
            section_title=chunk_data.get("section_title"),
            page_numbers=chunk_data.get("page_numbers"),
            metadata_json=chunk_data.get("metadata_json"),
            created_at=now,
        )
        db.add(chunk_obj)
        chunk_objects.append(chunk_obj)

    db.flush()

    # Apply cached embeddings
    copy_pairs: list[tuple[str, str]] = []
    pending_by_hash: dict[str, list[str]] = {}

    for idx, chunk_obj in enumerate(chunk_objects):
        h = content_hashes[idx]
        if h in cached_by_hash and cached_by_hash[h] != chunk_obj.id:
            copy_pairs.append((chunk_obj.id, cached_by_hash[h]))
        elif h not in cached_by_hash:
            pending_by_hash.setdefault(h, []).append(chunk_obj.id)

    for target_id, source_id in copy_pairs:
        db.execute(
            text(
                """
                UPDATE curriculum_chunks
                SET embedding = (SELECT embedding FROM curriculum_chunks WHERE id = :src)
                WHERE id = :tgt
                """
            ),
            {"src": source_id, "tgt": target_id},
        )

    if pending_by_hash and api_key:
        hashes_to_embed = list(pending_by_hash.keys())
        texts_to_embed = [
            next(
                chunks_data[i]["content"]
                for i, h in enumerate(content_hashes)
                if h == h_key
            )
            for h_key in hashes_to_embed
        ]
        logger.info(
            "[zpe-scraper] Generating %d new embeddings for document_id=%s",
            len(texts_to_embed),
            document_id,
        )
        embeddings = generate_embeddings_batch(texts_to_embed, api_key)
        for emb_idx, h_key in enumerate(hashes_to_embed):
            emb_str = "[" + ",".join(str(x) for x in embeddings[emb_idx]) + "]"
            for chunk_id in pending_by_hash[h_key]:
                db.execute(
                    text(
                        "UPDATE curriculum_chunks SET embedding = CAST(:emb AS vector) WHERE id = :id"
                    ),
                    {"emb": emb_str, "id": chunk_id},
                )
    elif pending_by_hash and not api_key:
        logger.warning(
            "[zpe-scraper] No API key — %d chunks stored without embeddings for document_id=%s",
            sum(len(v) for v in pending_by_hash.values()),
            document_id,
        )

    document.chunk_count = len(chunks_data)
    document.page_count = 1
    document.status = "ready"
    document.error_message = None
    document.updated_at = datetime.now(timezone.utc).isoformat()
    db.commit()

    logger.info(
        "[zpe-scraper] Document ready: document_id=%s chunks=%d cache_hits=%d new_embeddings=%d",
        document_id,
        len(chunks_data),
        len(copy_pairs),
        sum(len(v) for v in pending_by_hash.values()),
    )


# ── Public entry point ────────────────────────────────────────────────────────

def run_zpe_scraper(db_factory) -> None:  # noqa: ANN001
    """Crawl the ZPE curriculum tree and upsert all subject documents.

    ``db_factory`` must be a callable that returns a new SQLAlchemy Session
    (e.g. ``SessionLocal``).  It is called once and the session is reused for
    the entire run.
    """
    logger.info("[zpe-scraper] Starting full ZPE curriculum scrape…")
    db: DBSession = db_factory()
    try:
        api_key = _get_admin_api_key(db)
        if not api_key:
            logger.warning(
                "[zpe-scraper] Proceeding without an API key — embeddings will be skipped."
            )

        stage_pairs = _get_stage_urls()
        if not stage_pairs:
            logger.error("[zpe-scraper] No stages found — aborting.")
            return

        total_subjects = 0
        with _PlaywrightPdfRenderer() as pdf_renderer:
            for stage_url, stage_slug in stage_pairs:
                subject_triples = _get_subject_urls(stage_url, stage_slug)
                for subject_url, subject_slug, s_slug in subject_triples:
                    _process_subject_url(
                        db,
                        subject_url,
                        subject_slug,
                        s_slug,
                        api_key,
                        pdf_renderer,
                    )
                    total_subjects += 1

        logger.info(
            "[zpe-scraper] Scrape complete: stages=%d subjects_processed=%d",
            len(stage_pairs),
            total_subjects,
        )
    except Exception as exc:
        logger.error("[zpe-scraper] Unexpected error during scrape: %s", exc, exc_info=True)
    finally:
        db.close()
