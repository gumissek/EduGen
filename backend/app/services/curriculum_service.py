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

    for i in range(0, len(texts), batch_size):
        batch = texts[i : i + batch_size]
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
            1 - (cc.embedding <=> :embedding::vector) AS similarity,
            cd.original_filename,
            cd.education_level,
            cd.subject_name
        FROM curriculum_chunks cc
        JOIN curriculum_documents cd ON cc.document_id = cd.id
        WHERE {where_sql}
            AND cc.embedding IS NOT NULL
            AND 1 - (cc.embedding <=> :embedding::vector) >= :threshold
        ORDER BY cc.embedding <=> :embedding::vector
        LIMIT :top_k
    """)

    rows = db.execute(sql, params).fetchall()

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


def process_curriculum_document(db: DBSession, document_id: str, api_key: str) -> None:
    """Full processing pipeline: PDF → Markdown → Chunks → Embeddings.

    Runs as a background task.
    """
    document = db.query(CurriculumDocument).filter(CurriculumDocument.id == document_id).first()
    if not document:
        logger.warning("[curriculum] document_id=%s not found — skipping.", document_id)
        return

    try:
        # Update status to processing
        document.status = "processing"
        document.updated_at = datetime.now(timezone.utc).isoformat()
        db.commit()

        # Step 1: Get page count
        page_count = get_pdf_page_count(document.file_path)
        document.page_count = page_count

        # Step 2: Convert to Markdown
        doc_dir = str(Path(document.file_path).parent)
        markdown_path = convert_pdf_to_markdown(document.file_path, doc_dir)
        document.markdown_path = markdown_path

        # Step 3: Read markdown and chunk
        markdown_content = Path(markdown_path).read_text(encoding="utf-8")
        chunks_data = chunk_markdown(markdown_content)

        if not chunks_data:
            raise ValueError("No extractable text chunks from PDF")

        # Step 4: Generate embeddings
        texts_to_embed = []
        chunk_indices_to_embed = []
        all_chunk_objects = []

        for idx, chunk_data in enumerate(chunks_data):
            content_hash = _compute_content_hash(chunk_data["content"])

            # Check if chunk with this hash already exists for this document
            existing = (
                db.query(CurriculumChunk)
                .filter(
                    CurriculumChunk.document_id == document_id,
                    CurriculumChunk.content_hash == content_hash,
                )
                .first()
            )

            if existing:
                all_chunk_objects.append(existing)
                continue

            chunk_obj = CurriculumChunk(
                id=str(uuid4()),
                document_id=document_id,
                chunk_index=idx,
                content=chunk_data["content"],
                content_hash=content_hash,
                heading_hierarchy=chunk_data.get("heading_hierarchy"),
                section_title=chunk_data.get("section_title"),
            )
            db.add(chunk_obj)
            all_chunk_objects.append(chunk_obj)
            texts_to_embed.append(chunk_data["content"])
            chunk_indices_to_embed.append(len(all_chunk_objects) - 1)

        db.flush()

        # Generate embeddings for new chunks
        if texts_to_embed:
            embeddings = generate_embeddings_batch(texts_to_embed, api_key)

            for emb_idx, chunk_list_idx in enumerate(chunk_indices_to_embed):
                chunk_obj = all_chunk_objects[chunk_list_idx]
                embedding_str = "[" + ",".join(str(x) for x in embeddings[emb_idx]) + "]"
                db.execute(
                    text("UPDATE curriculum_chunks SET embedding = :emb::vector WHERE id = :id"),
                    {"emb": embedding_str, "id": chunk_obj.id},
                )

        # Update document status
        document.chunk_count = len(all_chunk_objects)
        document.status = "ready"
        document.error_message = None
        document.updated_at = datetime.now(timezone.utc).isoformat()
        db.commit()
        logger.info("[curriculum] Processed document_id=%s — %d chunks.", document_id, len(all_chunk_objects))

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
