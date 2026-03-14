"""Curriculum service — PDF processing, chunking, embedding, and vector search."""

from __future__ import annotations

import hashlib
import json
import logging
import re
from datetime import datetime, timezone
from pathlib import Path
from uuid import uuid4

import requests as http_requests
from sqlalchemy import text
from sqlalchemy.orm import Session as DBSession

from app.config import settings
from app.models.curriculum_chunk import CurriculumChunk
from app.models.curriculum_document import CurriculumDocument

logger = logging.getLogger(__name__)

OPENROUTER_API_URL = "https://openrouter.ai/api/v1/chat/completions"
EMBEDDING_MODEL = "openai/text-embedding-3-small"
EMBEDDING_DIMENSIONS = 1536


def _compute_file_hash(file_bytes: bytes) -> str:
    """Compute SHA-256 hash of file content."""
    return hashlib.sha256(file_bytes).hexdigest()


def _compute_content_hash(content: str) -> str:
    """Compute SHA-256 hash of text content."""
    return hashlib.sha256(content.encode("utf-8")).hexdigest()


def convert_pdf_to_markdown(pdf_path: str, output_dir: str) -> str:
    """Convert PDF to Markdown using PyMuPDF + markdownify fallback.

    Returns the path to the generated .md file.
    """
    import fitz  # PyMuPDF
    from markdownify import markdownify as md_convert

    logger.info("[curriculum] Converting PDF to markdown: pdf_path=%s", pdf_path)

    doc = fitz.open(pdf_path)
    all_text_parts = []

    for page_num in range(len(doc)):
        page = doc[page_num]
        # Extract HTML for better structure preservation
        html = page.get_text("html")
        if html and html.strip():
            md = md_convert(html, heading_style="ATX", bullets="-")
            all_text_parts.append(f"<!-- Page {page_num + 1} -->\n{md}")

    doc.close()

    markdown_content = "\n\n---\n\n".join(all_text_parts)

    output_path = Path(output_dir) / "content.md"
    output_path.parent.mkdir(parents=True, exist_ok=True)
    output_path.write_text(markdown_content, encoding="utf-8")

    logger.info(
        "[curriculum] PDF converted to markdown: pdf_path=%s markdown_path=%s pages_with_text=%d",
        pdf_path,
        output_path,
        len(all_text_parts),
    )

    return str(output_path)


def get_pdf_page_count(pdf_path: str) -> int:
    """Get page count of a PDF file."""
    import fitz
    doc = fitz.open(pdf_path)
    count = len(doc)
    doc.close()
    return count


def chunk_markdown(
    markdown_content: str,
    chunk_size: int = 1000,
    chunk_overlap: int = 200,
) -> list[dict]:
    """Split Markdown content into chunks with heading hierarchy metadata.

    Uses LangChain's MarkdownHeaderTextSplitter for structural splits,
    then RecursiveCharacterTextSplitter for size-based splits.
    """
    from langchain_text_splitters import (
        MarkdownHeaderTextSplitter,
        RecursiveCharacterTextSplitter,
    )

    headers_to_split_on = [
        ("#", "h1"),
        ("##", "h2"),
        ("###", "h3"),
        ("####", "h4"),
    ]

    header_splitter = MarkdownHeaderTextSplitter(
        headers_to_split_on=headers_to_split_on,
        strip_headers=False,
    )
    header_docs = header_splitter.split_text(markdown_content)

    char_splitter = RecursiveCharacterTextSplitter(
        chunk_size=chunk_size,
        chunk_overlap=chunk_overlap,
        separators=["\n\n", "\n", ". ", " ", ""],
    )

    chunks = []
    for doc in header_docs:
        sub_docs = char_splitter.split_text(doc.page_content)
        heading_hierarchy = []
        for key in ("h1", "h2", "h3", "h4"):
            if key in doc.metadata:
                heading_hierarchy.append(doc.metadata[key])

        section_title = heading_hierarchy[-1] if heading_hierarchy else None

        for sub_text in sub_docs:
            if len(sub_text.strip()) < 50:
                continue  # Skip very short chunks
            chunks.append({
                "content": sub_text.strip(),
                "heading_hierarchy": json.dumps(heading_hierarchy, ensure_ascii=False) if heading_hierarchy else None,
                "section_title": section_title,
            })

    logger.info(
        "[curriculum] Markdown chunked: header_sections=%d chunks=%d chunk_size=%d chunk_overlap=%d",
        len(header_docs),
        len(chunks),
        chunk_size,
        chunk_overlap,
    )

    return chunks


def generate_embedding(text: str, api_key: str) -> list[float]:
    """Generate embedding for a single text using OpenRouter."""
    resp = http_requests.post(
        "https://openrouter.ai/api/v1/embeddings",
        headers={
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json",
        },
        json={
            "model": EMBEDDING_MODEL,
            "input": text,
        },
        timeout=60,
    )

    if resp.status_code != 200:
        error_detail = ""
        try:
            error_detail = resp.json().get("error", {}).get("message", resp.text[:500])
        except Exception:
            error_detail = resp.text[:500]
        raise RuntimeError(f"Embedding API error ({resp.status_code}): {error_detail}")

    return resp.json()["data"][0]["embedding"]


def generate_embeddings_batch(texts: list[str], api_key: str, batch_size: int = 50) -> list[list[float]]:
    """Generate embeddings in batches."""
    all_embeddings: list[list[float]] = []

    logger.info(
        "[curriculum] Starting embeddings batch generation: texts=%d batch_size=%d",
        len(texts),
        batch_size,
    )

    for i in range(0, len(texts), batch_size):
        batch = texts[i : i + batch_size]
        batch_number = (i // batch_size) + 1
        total_batches = (len(texts) + batch_size - 1) // batch_size
        logger.info(
            "[curriculum] Embedding batch %d/%d: items=%d",
            batch_number,
            total_batches,
            len(batch),
        )
        resp = http_requests.post(
            "https://openrouter.ai/api/v1/embeddings",
            headers={
                "Authorization": f"Bearer {api_key}",
                "Content-Type": "application/json",
            },
            json={
                "model": EMBEDDING_MODEL,
                "input": batch,
            },
            timeout=120,
        )

        if resp.status_code != 200:
            error_detail = ""
            try:
                error_detail = resp.json().get("error", {}).get("message", resp.text[:500])
            except Exception:
                error_detail = resp.text[:500]
            raise RuntimeError(f"Embedding API error ({resp.status_code}): {error_detail}")

        data = resp.json()["data"]
        # Sort by index to maintain order
        data.sort(key=lambda x: x["index"])
        all_embeddings.extend([d["embedding"] for d in data])

    logger.info(
        "[curriculum] Embedding generation finished: generated=%d",
        len(all_embeddings),
    )

    return all_embeddings


def search_similar_chunks(
    db: DBSession,
    query_embedding: list[float],
    top_k: int = 10,
    education_level: str | None = None,
    subject_name: str | None = None,
    similarity_threshold: float = 0.3,
) -> list[dict]:
    """Search for similar curriculum chunks using pgvector cosine similarity."""
    logger.info(
        "[curriculum] Similarity search started: top_k=%d threshold=%.3f education_level=%s subject_name=%s",
        top_k,
        similarity_threshold,
        education_level,
        subject_name,
    )

    embedding_str = "[" + ",".join(str(x) for x in query_embedding) + "]"

    where_clauses = ["cd.status = 'ready'"]
    params: dict = {"embedding": embedding_str, "top_k": top_k, "threshold": similarity_threshold}

    if education_level:
        where_clauses.append("cd.education_level = :education_level")
        params["education_level"] = education_level

    if subject_name:
        where_clauses.append("cd.subject_name = :subject_name")
        params["subject_name"] = subject_name

    where_sql = " AND ".join(where_clauses)

    sql = text(f"""
        SELECT
            cc.id,
            cc.document_id,
            cc.chunk_index,
            cc.content,
            cc.section_title,
            cc.heading_hierarchy,
            1 - (cc.embedding <=> CAST(:embedding AS vector)) AS similarity,
            cd.original_filename,
            cd.education_level,
            cd.subject_name
        FROM curriculum_chunks cc
        JOIN curriculum_documents cd ON cc.document_id = cd.id
        WHERE {where_sql}
            AND cc.embedding IS NOT NULL
            AND 1 - (cc.embedding <=> CAST(:embedding AS vector)) >= :threshold
        ORDER BY cc.embedding <=> CAST(:embedding AS vector)
        LIMIT :top_k
    """)

    rows = db.execute(sql, params).fetchall()

    logger.info("[curriculum] Similarity search finished: matches=%d", len(rows))

    return [
        {
            "chunk": {
                "id": row[0],
                "document_id": row[1],
                "chunk_index": row[2],
                "content": row[3],
                "section_title": row[4],
                "heading_hierarchy": row[5],
                "similarity_score": float(row[6]),
            },
            "document_filename": row[7],
            "document_education_level": row[8],
            "document_subject_name": row[9],
        }
        for row in rows
    ]


def _copy_chunks_from_document(db: DBSession, source_document_id: str, target_document_id: str) -> int:
    """Copy all chunks (including embeddings) from source to target document.

    Deletes any existing chunks for the target document first.
    Returns the number of chunks copied.
    """
    source_count_row = db.execute(
        text("SELECT COUNT(*) FROM curriculum_chunks WHERE document_id = :doc_id"),
        {"doc_id": source_document_id},
    ).scalar()
    source_count = source_count_row or 0

    logger.info(
        "[curriculum] _copy_chunks: source_document_id=%s target_document_id=%s source_chunks=%d",
        source_document_id,
        target_document_id,
        source_count,
    )

    # Remove any pre-existing chunks for the target document
    deleted = db.execute(
        text("DELETE FROM curriculum_chunks WHERE document_id = :doc_id"),
        {"doc_id": target_document_id},
    ).rowcount
    if deleted > 0:
        logger.info(
            "[curriculum] _copy_chunks: cleared existing target chunks: target_document_id=%s deleted=%d",
            target_document_id,
            deleted,
        )

    if source_count == 0:
        logger.warning(
            "[curriculum] _copy_chunks: source document has no chunks — nothing to copy: source_document_id=%s",
            source_document_id,
        )
        return 0

    # Insert copies of all source chunks preserving their embeddings
    result = db.execute(
        text(
            """
            INSERT INTO curriculum_chunks (
                id, document_id, chunk_index, content, content_hash,
                heading_hierarchy, section_title, page_numbers, metadata_json,
                embedding, created_at
            )
            SELECT
                gen_random_uuid()::text,
                :target_doc_id,
                chunk_index,
                content,
                content_hash,
                heading_hierarchy,
                section_title,
                page_numbers,
                metadata_json,
                embedding,
                :now
            FROM curriculum_chunks
            WHERE document_id = :source_doc_id
            ORDER BY chunk_index
            """
        ),
        {
            "target_doc_id": target_document_id,
            "source_doc_id": source_document_id,
            "now": datetime.now(timezone.utc).isoformat(),
        },
    )
    copied = result.rowcount
    db.flush()

    logger.info(
        "[curriculum] _copy_chunks: done: source_document_id=%s target_document_id=%s chunks_copied=%d",
        source_document_id,
        target_document_id,
        copied,
    )
    return copied


def process_curriculum_document(db: DBSession, document_id: str, api_key: str) -> None:
    """Full processing pipeline: PDF → Markdown → Chunks → Embeddings.

    Caching strategy (two levels):
      1. Document-level (Step 0): if another CurriculumDocument with the same
         file_hash is already status='ready', copy all its chunks directly —
         no PDF parsing or embedding API calls needed.
      2. Content-hash level (Step 4): for each individual chunk, check whether
         a chunk with the same content_hash already has an embedding in any
         document. If yes, copy the embedding; otherwise call the embedding API.

    Runs as a background task.
    """
    document = db.query(CurriculumDocument).filter(CurriculumDocument.id == document_id).first()
    if not document:
        logger.warning("[curriculum] document_id=%s not found — skipping.", document_id)
        return

    try:
        logger.info(
            "[curriculum] Processing started: document_id=%s file_hash=%.12s original_filename=%s",
            document_id,
            document.file_hash,
            document.original_filename,
        )

        # Update status to processing
        document.status = "processing"
        document.updated_at = datetime.now(timezone.utc).isoformat()
        db.commit()

        # ── Step 0: Document-level cache ──────────────────────────────────────
        logger.info(
            "[curriculum] Step 0/4: document-level cache check: document_id=%s file_hash=%.12s",
            document_id,
            document.file_hash,
        )
        source_doc = (
            db.query(CurriculumDocument)
            .filter(
                CurriculumDocument.file_hash == document.file_hash,
                CurriculumDocument.id != document_id,
                CurriculumDocument.status == "ready",
            )
            .first()
        )

        if source_doc:
            logger.info(
                "[curriculum] Step 0/4 cache HIT: document_id=%s reusing source_document_id=%s "
                "source_chunk_count=%d — skipping full pipeline.",
                document_id,
                source_doc.id,
                source_doc.chunk_count,
            )
            copied = _copy_chunks_from_document(db, source_doc.id, document_id)
            document.page_count = source_doc.page_count
            document.markdown_path = source_doc.markdown_path
            document.chunk_count = copied
            document.status = "ready"
            document.error_message = None
            document.updated_at = datetime.now(timezone.utc).isoformat()
            db.commit()
            logger.info(
                "[curriculum] Processing finished via document-level cache: document_id=%s "
                "status=ready chunks_copied=%d",
                document_id,
                copied,
            )
            return

        logger.info(
            "[curriculum] Step 0/4 cache MISS: document_id=%s — proceeding with full PDF pipeline.",
            document_id,
        )

        # ── Step 1: Get page count ────────────────────────────────────────────
        logger.info("[curriculum] Step 1/4: counting pages: document_id=%s file_path=%s", document_id, document.file_path)
        page_count = get_pdf_page_count(document.file_path)
        document.page_count = page_count
        logger.info("[curriculum] Step 1/4 done: document_id=%s page_count=%d", document_id, page_count)

        # ── Step 2: Convert PDF → Markdown ────────────────────────────────────
        logger.info("[curriculum] Step 2/4: converting PDF to Markdown: document_id=%s", document_id)
        doc_dir = str(Path(document.file_path).parent)
        markdown_path = convert_pdf_to_markdown(document.file_path, doc_dir)
        document.markdown_path = markdown_path
        logger.info(
            "[curriculum] Step 2/4 done: document_id=%s markdown_path=%s",
            document_id,
            markdown_path,
        )

        # ── Step 3: Chunk the Markdown ────────────────────────────────────────
        logger.info("[curriculum] Step 3/4: chunking markdown: document_id=%s", document_id)
        markdown_content = Path(markdown_path).read_text(encoding="utf-8")
        chunks_data = chunk_markdown(markdown_content)
        logger.info(
            "[curriculum] Step 3/4 done: document_id=%s chunk_candidates=%d",
            document_id,
            len(chunks_data),
        )

        if not chunks_data:
            raise ValueError("No extractable text chunks from PDF")

        # ── Step 4: Resolve content-hash cache and generate missing embeddings ─
        logger.info(
            "[curriculum] Step 4/4: resolving content-hash cache: document_id=%s total_chunks=%d",
            document_id,
            len(chunks_data),
        )

        existing_doc_chunks = (
            db.query(CurriculumChunk)
            .filter(CurriculumChunk.document_id == document_id)
            .all()
        )
        existing_by_index = {chunk.chunk_index: chunk for chunk in existing_doc_chunks}
        logger.info(
            "[curriculum] Step 4/4: existing chunks in DB for this document: document_id=%s existing=%d",
            document_id,
            len(existing_doc_chunks),
        )

        # Compute content hashes for all incoming chunks
        content_hashes = [_compute_content_hash(chunk_data["content"]) for chunk_data in chunks_data]
        unique_content_hashes = list(dict.fromkeys(content_hashes))
        logger.info(
            "[curriculum] Step 4/4: content-hash stats: document_id=%s total=%d unique=%d",
            document_id,
            len(content_hashes),
            len(unique_content_hashes),
        )

        # Query global cache: find any chunk (across all documents) that already
        # has an embedding for each unique content_hash.
        logger.info(
            "[curriculum] Step 4/4: querying global content-hash cache: document_id=%s unique_hashes=%d",
            document_id,
            len(unique_content_hashes),
        )
        cached_rows = db.execute(
            text(
                """
                SELECT DISTINCT ON (content_hash)
                    content_hash,
                    id,
                    document_id
                FROM curriculum_chunks
                WHERE content_hash = ANY(CAST(:content_hashes AS text[]))
                  AND embedding IS NOT NULL
                ORDER BY content_hash, created_at DESC
                """
            ),
            {"content_hashes": unique_content_hashes},
        ).fetchall()
        cached_by_hash = {row[0]: {"id": row[1], "document_id": row[2]} for row in cached_rows}
        logger.info(
            "[curriculum] Step 4/4: global cache lookup result: document_id=%s hashes_with_cached_embedding=%d",
            document_id,
            len(cached_by_hash),
        )

        pending_embeddings_by_hash: dict[str, dict[str, object]] = {}
        cache_copy_pairs: list[tuple[str, str]] = []
        cache_hits = 0
        cache_misses = 0
        created_chunks = 0

        for idx, chunk_data in enumerate(chunks_data):
            content = chunk_data["content"]
            content_hash = content_hashes[idx]

            chunk_obj = existing_by_index.get(idx)
            if chunk_obj is None:
                logger.debug(
                    "[curriculum] Step 4/4: creating new chunk: document_id=%s chunk_index=%d hash=%.12s",
                    document_id,
                    idx,
                    content_hash,
                )
                chunk_obj = CurriculumChunk(
                    id=str(uuid4()),
                    document_id=document_id,
                    chunk_index=idx,
                    content=content,
                    content_hash=content_hash,
                    heading_hierarchy=chunk_data.get("heading_hierarchy"),
                    section_title=chunk_data.get("section_title"),
                )
                db.add(chunk_obj)
                created_chunks += 1
            else:
                logger.debug(
                    "[curriculum] Step 4/4: updating existing chunk: document_id=%s chunk_index=%d "
                    "old_hash=%.12s new_hash=%.12s chunk_id=%s",
                    document_id,
                    idx,
                    chunk_obj.content_hash[:12] if chunk_obj.content_hash else "none",
                    content_hash[:12],
                    chunk_obj.id,
                )
                chunk_obj.content = content
                chunk_obj.content_hash = content_hash
                chunk_obj.heading_hierarchy = chunk_data.get("heading_hierarchy")
                chunk_obj.section_title = chunk_data.get("section_title")

            # Per-chunk content-hash cache lookup (global, across all documents)
            cached_source = cached_by_hash.get(content_hash)

            if cached_source:
                cache_hits += 1
                logger.info(
                    "[curriculum] Step 4/4: chunk %d content-hash cache HIT: hash=%.12s "
                    "source_chunk_id=%s source_document_id=%s target_chunk_id=%s",
                    idx,
                    content_hash[:12],
                    cached_source["id"],
                    cached_source["document_id"],
                    chunk_obj.id,
                )
                # Only schedule a copy when target and source are different rows
                if cached_source["id"] != chunk_obj.id:
                    cache_copy_pairs.append((chunk_obj.id, cached_source["id"]))
                else:
                    logger.debug(
                        "[curriculum] Step 4/4: chunk %d embedding already owned by this chunk — no copy needed: chunk_id=%s",
                        idx,
                        chunk_obj.id,
                    )
            else:
                cache_misses += 1
                logger.info(
                    "[curriculum] Step 4/4: chunk %d content-hash cache MISS: hash=%.12s "
                    "queued_for_embedding=true target_chunk_id=%s",
                    idx,
                    content_hash[:12],
                    chunk_obj.id,
                )
                # Clear any stale embedding on existing chunks (no-op for brand-new chunks)
                db.execute(
                    text("UPDATE curriculum_chunks SET embedding = NULL WHERE id = :id"),
                    {"id": chunk_obj.id},
                )
                pending = pending_embeddings_by_hash.get(content_hash)
                if pending is None:
                    pending_embeddings_by_hash[content_hash] = {
                        "content": content,
                        "target_ids": [chunk_obj.id],
                    }
                else:
                    pending["target_ids"].append(chunk_obj.id)  # type: ignore[union-attr]

        db.flush()
        logger.info(
            "[curriculum] Step 4/4: chunks flushed to DB: document_id=%s flushed=%d",
            document_id,
            len(chunks_data),
        )

        # Remove chunks whose index is no longer valid (document shrank)
        if len(existing_doc_chunks) > len(chunks_data):
            stale_chunks_removed = 0
            for stale_chunk in existing_doc_chunks:
                if stale_chunk.chunk_index >= len(chunks_data):
                    db.delete(stale_chunk)
                    stale_chunks_removed += 1
            if stale_chunks_removed:
                logger.info(
                    "[curriculum] Step 4/4: removed stale chunks (document shrank): "
                    "document_id=%s removed=%d",
                    document_id,
                    stale_chunks_removed,
                )

        # Apply embedding copies for content-hash cache hits
        if cache_copy_pairs:
            logger.info(
                "[curriculum] Step 4/4: applying embedding copies for cache hits: "
                "document_id=%s copy_pairs=%d",
                document_id,
                len(cache_copy_pairs),
            )
            for target_id, source_id in cache_copy_pairs:
                logger.debug(
                    "[curriculum] Step 4/4: copying embedding: source_chunk_id=%s → target_chunk_id=%s",
                    source_id,
                    target_id,
                )
                db.execute(
                    text(
                        """
                        UPDATE curriculum_chunks
                        SET embedding = (SELECT embedding FROM curriculum_chunks WHERE id = :source_id)
                        WHERE id = :target_id
                        """
                    ),
                    {"target_id": target_id, "source_id": source_id},
                )

        logger.info(
            "[curriculum] Step 4/4: content-hash cache summary: document_id=%s total=%d "
            "cache_hits=%d cache_misses=%d new_chunks=%d copy_pairs=%d",
            document_id,
            len(chunks_data),
            cache_hits,
            cache_misses,
            created_chunks,
            len(cache_copy_pairs),
        )

        # Generate embeddings only for truly new/changed content
        hashes_to_embed = list(pending_embeddings_by_hash.keys())
        texts_to_embed = [pending_embeddings_by_hash[h]["content"] for h in hashes_to_embed]

        if texts_to_embed:
            logger.info(
                "[curriculum] Step 4/4: calling embedding API: document_id=%s "
                "embeddings_to_generate=%d unique_hashes=%d",
                document_id,
                len(texts_to_embed),
                len(hashes_to_embed),
            )
            embeddings = generate_embeddings_batch(texts_to_embed, api_key)

            for emb_idx, content_hash in enumerate(hashes_to_embed):
                embedding_str = "[" + ",".join(str(x) for x in embeddings[emb_idx]) + "]"
                target_ids = pending_embeddings_by_hash[content_hash]["target_ids"]
                logger.debug(
                    "[curriculum] Step 4/4: writing embedding: hash=%.12s target_chunk_ids=%s",
                    content_hash[:12],
                    target_ids,
                )
                for chunk_id in target_ids:
                    db.execute(
                        text("UPDATE curriculum_chunks SET embedding = CAST(:emb AS vector) WHERE id = :id"),
                        {"emb": embedding_str, "id": chunk_id},
                    )
            logger.info(
                "[curriculum] Step 4/4 done: document_id=%s generated_embeddings=%d",
                document_id,
                len(embeddings),
            )
        else:
            logger.info(
                "[curriculum] Step 4/4 skipped (all chunks served from cache): document_id=%s",
                document_id,
            )

        # Finalise document record
        document.chunk_count = len(chunks_data)
        document.status = "ready"
        document.error_message = None
        document.updated_at = datetime.now(timezone.utc).isoformat()
        db.commit()
        logger.info(
            "[curriculum] Processing finished: document_id=%s status=ready chunks=%d "
            "cache_hits=%d cache_misses=%d new_chunks=%d",
            document_id,
            len(chunks_data),
            cache_hits,
            cache_misses,
            created_chunks,
        )

    except Exception as e:
        logger.error("[curriculum] Processing failed for document_id=%s: %s", document_id, e, exc_info=True)
        db.rollback()
        document = db.query(CurriculumDocument).filter(CurriculumDocument.id == document_id).first()
        if document:
            document.status = "error"
            document.error_message = str(e)[:2000]
            document.updated_at = datetime.now(timezone.utc).isoformat()
            db.commit()


def check_compliance(
    db: DBSession,
    questions: list[dict],
    api_key: str,
    education_level: str | None = None,
    subject_name: str | None = None,
) -> dict:
    """Run per-question compliance check against curriculum chunks.

    For each question, embeds the question text, searches for matching
    curriculum chunks, and returns a compliance mapping.
    """
    results = []
    unique_requirements = set()

    for idx, question in enumerate(questions):
        q_text = question.get("content", "") or question.get("text", "")
        if not q_text:
            results.append({
                "question_index": idx,
                "question_text": "",
                "matched_requirements": [],
            })
            continue

        # Embed question text
        q_embedding = generate_embedding(q_text, api_key)

        # Search for matching curriculum chunks
        matches = search_similar_chunks(
            db,
            q_embedding,
            top_k=3,
            education_level=education_level,
            subject_name=subject_name,
            similarity_threshold=0.3,
        )

        matched_reqs = []
        for match in matches:
            chunk = match["chunk"]
            req_code = _extract_requirement_code(chunk.get("heading_hierarchy"))
            matched_reqs.append({
                "requirement_code": req_code,
                "requirement_text": chunk["content"][:500],
                "section_title": chunk.get("section_title"),
                "similarity_score": chunk["similarity_score"],
                "document_name": match["document_filename"],
            })
            if req_code:
                unique_requirements.add(req_code)

        results.append({
            "question_index": idx,
            "question_text": q_text[:200],
            "matched_requirements": matched_reqs,
        })

    matched_count = sum(1 for r in results if r["matched_requirements"])
    return {
        "questions": results,
        "coverage_summary": {
            "matched_questions": matched_count,
            "total_questions": len(questions),
            "unique_requirements_covered": len(unique_requirements),
        },
        "generated_at": datetime.now(timezone.utc).isoformat(),
    }


def _extract_requirement_code(heading_hierarchy_json: str | None) -> str | None:
    """Extract a requirement code from heading hierarchy, e.g. 'II.1.2'."""
    if not heading_hierarchy_json:
        return None
    try:
        hierarchy = json.loads(heading_hierarchy_json)
        if not hierarchy:
            return None
        # Look for Roman numeral patterns or numbered sections
        for heading in hierarchy:
            match = re.search(r"([IVXLC]+\.?\s*\d*\.?\d*)", heading)
            if match:
                return match.group(1).strip()
        # Fallback: return last heading abbreviated
        return hierarchy[-1][:50] if hierarchy else None
    except (json.JSONDecodeError, TypeError):
        return None
