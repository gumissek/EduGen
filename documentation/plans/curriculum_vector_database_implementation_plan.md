# Implementation Plan: Curriculum Vector Database & Compliance Module

**Feature Name:** Baza Wektorowa Podstawy Programowej (Curriculum Vector Database)  
**Date:** 2026-03-14  
**Status:** Draft  

---

## Table of Contents

1. [Feature Overview](#1-feature-overview)
2. [Architecture Analysis](#2-architecture-analysis)
3. [Database Changes](#3-database-changes)
4. [Backend Implementation](#4-backend-implementation)
5. [Frontend Implementation](#5-frontend-implementation)
6. [Infrastructure Changes](#6-infrastructure-changes)
7. [RAG Pipeline Design](#7-rag-pipeline-design)
8. [Integration with Generation Flow](#8-integration-with-generation-flow)
9. [File Structure Changes](#9-file-structure-changes)
10. [Implementation Phases](#10-implementation-phases)
11. [Potential Problems & Mitigations](#11-potential-problems--mitigations)
12. [Suggested Improvements](#12-suggested-improvements)
13. [Testing Plan](#13-testing-plan)

---

## 1. Feature Overview

### 1.1 Functional Goal

Integrate official Polish National Curriculum documents (Podstawa Programowa) into EduGen as a vector database, enabling:

1. **Compliance Assistant** — AI-powered verification that generated educational materials align with specific curriculum requirements, displayed as badges/tags on each question in the prototype editor.
2. **Material Gap Analysis** — Comparison of user-uploaded source materials against curriculum requirements for a given class/level, with suggestions for missing topics.
3. **Director's Report** — Optional compliance matrix appended to exported DOCX documents, mapping each question to the specific curriculum requirement it addresses.

### 1.2 Problem It Solves

Teachers currently have no automated way to verify whether their generated tests and worksheets cover ministerial curriculum requirements. They must manually cross-reference documents — a tedious and error-prone process. This feature automates that validation with near-100% accuracy by using RAG (Retrieval Augmented Generation) against the official source texts.

### 1.3 New Capabilities

- Admin-managed curriculum document repository (upload PDF → extract → chunk → embed)
- Public-facing page for all users to view available curriculum documents
- Vector similarity search (pgvector) for curriculum requirement matching
- Per-question curriculum compliance tagging in the editor
- Gap analysis between source materials and curriculum
- Compliance report generation in DOCX export

### 1.4 System Impact

| Area | Impact |
|---|---|
| Database | New tables, pgvector extension, new migration |
| Backend | New router, new service, modified generation & docx services |
| Frontend | New page `/state-documents/pp`, admin upload UI, editor compliance badges |
| Infrastructure | pgvector Docker image, new Python dependencies |
| AI Costs | Embedding generation via OpenRouter (one-time per chunk), similarity search queries per generation |

---

## 2. Architecture Analysis

### 2.1 Integration Points

The feature integrates with the existing system at these points:

```
┌──────────────────────────────────────────────────────────────────┐
│                         EXISTING SYSTEM                         │
│                                                                 │
│  Admin Panel ──┐                                                │
│                ├── [NEW] Curriculum Upload UI                    │
│                │                                                │
│  Generation    ├── [MODIFIED] build_system_prompt() injects     │
│  Service       │   curriculum context from RAG                  │
│                │                                                │
│  Prototype     ├── [MODIFIED] Compliance badges in editor       │
│  Editor        │                                                │
│                │                                                │
│  DOCX Service  ├── [MODIFIED] Compliance table in export        │
│                │                                                │
│  PostgreSQL    ├── [MODIFIED] pgvector extension + new tables   │
└────────────────┘                                                │
                                                                  │
┌──────────────────────────────────────────────────────────────────┐
│                         NEW COMPONENTS                          │
│                                                                 │
│  /state-documents/pp  ── Public page listing curriculum docs    │
│  curriculum_service.py ── PDF processing, chunking, embedding   │
│  curriculum router     ── CRUD endpoints for curriculum docs    │
│  RAG pipeline          ── Vector search + context injection     │
└──────────────────────────────────────────────────────────────────┘
```

### 2.2 Affected Modules

| Module | Changes |
|---|---|
| `docker-compose.yml` | Switch to `pgvector/pgvector:pg16` image |
| `backend/pyproject.toml` | Add `markdrop`, `langchain-text-splitters`, `pgvector` |
| `backend/Dockerfile` | Install system deps for markdrop (poppler-utils) |
| `backend/app/models/` | New models: `CurriculumDocument`, `CurriculumChunk` |
| `backend/app/routers/` | New router: `curriculum.py` |
| `backend/app/services/` | New service: `curriculum_service.py`; modify `ai_service.py`, `generation_service.py`, `docx_service.py` |
| `backend/app/schemas/` | New schema: `curriculum.py` |
| `backend/app/main.py` | Register new router |
| `backend/alembic/versions/` | New migration: `004_add_curriculum_tables.py` |
| `frontend/src/app/` | New page: `state-documents/pp/page.tsx` |
| `frontend/src/app/(authenticated)/admin-panel/` | New section: curriculum management tile + page |
| `frontend/src/components/` | New: `curriculum/` directory with components |
| `frontend/src/hooks/` | New: `useCurriculum.ts` |
| `frontend/src/components/editor/` | Modify `TipTapEditor.tsx` for compliance badges |
| `frontend/src/components/layout/Sidebar.tsx` | Add navigation item |

---

## 3. Database Changes

### 3.1 Enable pgvector Extension

The pgvector extension must be enabled in PostgreSQL before any vector columns can be used.

```sql
CREATE EXTENSION IF NOT EXISTS vector;
```

This will be handled in the Alembic migration using `op.execute()`.

### 3.2 New Table: `curriculum_documents`

Stores metadata about uploaded curriculum PDF files.

| Column | Type | Constraints |
|---|---|---|
| `id` | VARCHAR(36) | PRIMARY KEY |
| `filename` | TEXT | NOT NULL |
| `original_filename` | TEXT | NOT NULL |
| `file_path` | TEXT | NOT NULL |
| `markdown_path` | TEXT | NULL |
| `file_size` | INTEGER | NOT NULL |
| `file_hash` | VARCHAR(64) | NOT NULL UNIQUE, INDEX |
| `education_level` | VARCHAR(50) | NULL |
| `subject_name` | VARCHAR(255) | NULL |
| `description` | TEXT | NULL |
| `status` | VARCHAR(20) | NOT NULL DEFAULT 'uploaded' |
| `error_message` | TEXT | NULL |
| `page_count` | INTEGER | NULL |
| `chunk_count` | INTEGER | NOT NULL DEFAULT 0 |
| `uploaded_by` | VARCHAR(36) | NOT NULL REFERENCES users(id) ON DELETE SET NULL |
| `created_at` | TEXT | NOT NULL (ISO 8601) |
| `updated_at` | TEXT | NOT NULL (ISO 8601) |

**Status values:** `uploaded` → `processing` → `ready` | `error`

**Notes:**
- `file_hash` (SHA-256) used for deduplication — prevents re-uploading the same document.
- `markdown_path` stores path to the converted `.md` file.
- `education_level` and `subject_name` are user-provided metadata to filter curriculum scope.

### 3.3 New Table: `curriculum_chunks`

Stores chunked text with vector embeddings and structural metadata.

| Column | Type | Constraints |
|---|---|---|
| `id` | VARCHAR(36) | PRIMARY KEY |
| `document_id` | VARCHAR(36) | NOT NULL REFERENCES curriculum_documents(id) ON DELETE CASCADE, INDEX |
| `chunk_index` | INTEGER | NOT NULL |
| `content` | TEXT | NOT NULL |
| `content_hash` | VARCHAR(64) | NOT NULL, INDEX |
| `heading_hierarchy` | TEXT | NULL (JSON array, e.g. `["II. Kształcenie", "1. Język polski"]`) |
| `section_title` | TEXT | NULL |
| `page_numbers` | TEXT | NULL (e.g. `"12-14"`) |
| `metadata_json` | TEXT | NULL (JSON string) |
| `embedding` | VECTOR(1536) | NULL, INDEX (ivfflat or hnsw) |
| `created_at` | TEXT | NOT NULL (ISO 8601) |

**Notes:**
- `VECTOR(1536)` — dimension for `text-embedding-3-small` from OpenAI.
- `content_hash` (SHA-256 of chunk text) enables skip-if-exists caching — if a chunk with the same hash already exists for this document, skip embedding generation.
- `heading_hierarchy` preserves the Markdown heading context (`#`, `##`, `###`) from the parent document so we know where in the curriculum structure this chunk lives.
- `metadata_json` stores additional extraction metadata (tables detected, content type, etc.).

**Composite UNIQUE constraint:** `(document_id, chunk_index)` — ensures ordered, non-duplicate chunks per document.

### 3.4 Indexes

```sql
-- Curriculum documents
CREATE INDEX ix_curriculum_documents_status ON curriculum_documents(status);
CREATE UNIQUE INDEX ix_curriculum_documents_file_hash ON curriculum_documents(file_hash);
CREATE INDEX ix_curriculum_documents_education_level ON curriculum_documents(education_level);

-- Curriculum chunks
CREATE INDEX ix_curriculum_chunks_document_id ON curriculum_chunks(document_id);
CREATE INDEX ix_curriculum_chunks_content_hash ON curriculum_chunks(content_hash);
CREATE UNIQUE INDEX uq_curriculum_chunks_doc_index ON curriculum_chunks(document_id, chunk_index);

-- Vector similarity index (HNSW for better recall)
CREATE INDEX ix_curriculum_chunks_embedding ON curriculum_chunks
  USING hnsw (embedding vector_cosine_ops)
  WITH (m = 16, ef_construction = 64);
```

**Why HNSW over IVFFlat:** HNSW provides better recall for small-to-medium datasets (curriculum documents are finite — ~50-500 chunks per subject). It also doesn't require a separate `CREATE INDEX ... WITH (lists = ...)` training step or minimum row thresholds.

### 3.5 Schema Modifications to Existing Tables

#### `prototypes` table — add `compliance_json`

| Column | Type | Constraints |
|---|---|---|
| `compliance_json` | TEXT | NULL (JSON string) |

Stores the per-question curriculum compliance mapping. Structure:

```json
{
  "questions": [
    {
      "question_index": 0,
      "question_text_snippet": "Wskaż podmiot w zdaniu...",
      "matched_requirements": [
        {
          "chunk_id": "uuid",
          "requirement_code": "II.1.2",
          "requirement_text": "Uczeń rozpoznaje i nazywa części mowy",
          "similarity_score": 0.91,
          "section_title": "Kształcenie językowe",
          "page_numbers": "45-46"
        }
      ]
    }
  ],
  "coverage_summary": {
    "matched_questions": 8,
    "total_questions": 10,
    "unique_requirements_covered": 5
  },
  "generated_at": "2026-03-14T10:00:00Z"
}
```

#### `generations` table — add `curriculum_compliance_enabled`

| Column | Type | Constraints |
|---|---|---|
| `curriculum_compliance_enabled` | BOOLEAN | NOT NULL DEFAULT FALSE |

Indicates whether curriculum compliance check was requested for this generation. Controls whether the RAG pipeline runs during generation.

### 3.6 Alembic Migration

**File:** `backend/alembic/versions/004_add_curriculum_tables.py`

```python
"""Add curriculum vector database tables

Revision ID: 004
Revises: 003
Create Date: 2026-03-14
"""

from alembic import op
import sqlalchemy as sa

revision = "004"
down_revision = "003"

def upgrade():
    # Enable pgvector extension
    op.execute("CREATE EXTENSION IF NOT EXISTS vector")

    # curriculum_documents table
    op.create_table(
        "curriculum_documents",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("filename", sa.Text(), nullable=False),
        sa.Column("original_filename", sa.Text(), nullable=False),
        sa.Column("file_path", sa.Text(), nullable=False),
        sa.Column("markdown_path", sa.Text(), nullable=True),
        sa.Column("file_size", sa.Integer(), nullable=False),
        sa.Column("file_hash", sa.String(64), nullable=False, unique=True),
        sa.Column("education_level", sa.String(50), nullable=True),
        sa.Column("subject_name", sa.String(255), nullable=True),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("status", sa.String(20), nullable=False, server_default="uploaded"),
        sa.Column("error_message", sa.Text(), nullable=True),
        sa.Column("page_count", sa.Integer(), nullable=True),
        sa.Column("chunk_count", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("uploaded_by", sa.String(36), sa.ForeignKey("users.id", ondelete="SET NULL"), nullable=True),
        sa.Column("created_at", sa.Text(), nullable=False),
        sa.Column("updated_at", sa.Text(), nullable=False),
    )
    op.create_index("ix_curriculum_documents_status", "curriculum_documents", ["status"])
    op.create_index("ix_curriculum_documents_education_level", "curriculum_documents", ["education_level"])

    # curriculum_chunks table
    op.create_table(
        "curriculum_chunks",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("document_id", sa.String(36), sa.ForeignKey("curriculum_documents.id", ondelete="CASCADE"), nullable=False),
        sa.Column("chunk_index", sa.Integer(), nullable=False),
        sa.Column("content", sa.Text(), nullable=False),
        sa.Column("content_hash", sa.String(64), nullable=False),
        sa.Column("heading_hierarchy", sa.Text(), nullable=True),
        sa.Column("section_title", sa.Text(), nullable=True),
        sa.Column("page_numbers", sa.Text(), nullable=True),
        sa.Column("metadata_json", sa.Text(), nullable=True),
        # VECTOR(1536) added via raw SQL below
        sa.Column("created_at", sa.Text(), nullable=False),
    )
    op.create_index("ix_curriculum_chunks_document_id", "curriculum_chunks", ["document_id"])
    op.create_index("ix_curriculum_chunks_content_hash", "curriculum_chunks", ["content_hash"])
    op.create_unique_constraint("uq_curriculum_chunks_doc_index", "curriculum_chunks", ["document_id", "chunk_index"])

    # Add vector column (pgvector type, not native SQLAlchemy)
    op.execute("ALTER TABLE curriculum_chunks ADD COLUMN embedding vector(1536)")

    # HNSW index for cosine similarity
    op.execute("""
        CREATE INDEX ix_curriculum_chunks_embedding
        ON curriculum_chunks
        USING hnsw (embedding vector_cosine_ops)
        WITH (m = 16, ef_construction = 64)
    """)

    # Add compliance_json to prototypes
    op.add_column("prototypes", sa.Column("compliance_json", sa.Text(), nullable=True))

    # Add curriculum_compliance_enabled to generations
    op.add_column("generations", sa.Column("curriculum_compliance_enabled", sa.Boolean(), nullable=False, server_default="false"))


def downgrade():
    op.drop_column("generations", "curriculum_compliance_enabled")
    op.drop_column("prototypes", "compliance_json")
    op.execute("DROP INDEX IF EXISTS ix_curriculum_chunks_embedding")
    op.drop_table("curriculum_chunks")
    op.drop_table("curriculum_documents")
    op.execute("DROP EXTENSION IF EXISTS vector")
```

---

## 4. Backend Implementation

### 4.1 New Models

#### `backend/app/models/curriculum_document.py`

```python
from sqlalchemy import Column, String, Text, Integer, ForeignKey
from sqlalchemy.orm import relationship
from app.database import Base


class CurriculumDocument(Base):
    __tablename__ = "curriculum_documents"

    id = Column(String(36), primary_key=True)
    filename = Column(Text, nullable=False)
    original_filename = Column(Text, nullable=False)
    file_path = Column(Text, nullable=False)
    markdown_path = Column(Text, nullable=True)
    file_size = Column(Integer, nullable=False)
    file_hash = Column(String(64), nullable=False, unique=True, index=True)
    education_level = Column(String(50), nullable=True)
    subject_name = Column(String(255), nullable=True)
    description = Column(Text, nullable=True)
    status = Column(String(20), nullable=False, default="uploaded")
    error_message = Column(Text, nullable=True)
    page_count = Column(Integer, nullable=True)
    chunk_count = Column(Integer, nullable=False, default=0)
    uploaded_by = Column(String(36), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    created_at = Column(Text, nullable=False)
    updated_at = Column(Text, nullable=False)

    chunks = relationship("CurriculumChunk", back_populates="document", cascade="all, delete-orphan")
```

#### `backend/app/models/curriculum_chunk.py`

```python
from sqlalchemy import Column, String, Text, Integer, ForeignKey, UniqueConstraint
from sqlalchemy.orm import relationship
from app.database import Base


class CurriculumChunk(Base):
    __tablename__ = "curriculum_chunks"
    __table_args__ = (
        UniqueConstraint("document_id", "chunk_index", name="uq_curriculum_chunks_doc_index"),
    )

    id = Column(String(36), primary_key=True)
    document_id = Column(String(36), ForeignKey("curriculum_documents.id", ondelete="CASCADE"), nullable=False, index=True)
    chunk_index = Column(Integer, nullable=False)
    content = Column(Text, nullable=False)
    content_hash = Column(String(64), nullable=False, index=True)
    heading_hierarchy = Column(Text, nullable=True)   # JSON array string
    section_title = Column(Text, nullable=True)
    page_numbers = Column(Text, nullable=True)
    metadata_json = Column(Text, nullable=True)
    # embedding column defined as vector(1536) in migration, accessed via raw SQL
    created_at = Column(Text, nullable=False)

    document = relationship("CurriculumDocument", back_populates="chunks")
```

**Note:** The `embedding` column uses pgvector's `vector` type. SQLAlchemy interaction will use raw SQL or the `pgvector` Python package's SQLAlchemy integration (`from pgvector.sqlalchemy import Vector`). We use `pgvector.sqlalchemy` for the column type definition in the model.

### 4.2 New Schemas

#### `backend/app/schemas/curriculum.py`

```python
from pydantic import BaseModel, Field


# --- Request schemas ---

class CurriculumDocumentUpload(BaseModel):
    """Metadata sent alongside the PDF file upload (form fields)."""
    education_level: str | None = None
    subject_name: str | None = None
    description: str | None = None


# --- Response schemas ---

class CurriculumDocumentResponse(BaseModel):
    id: str
    filename: str
    original_filename: str
    file_size: int
    file_hash: str
    education_level: str | None
    subject_name: str | None
    description: str | None
    status: str
    error_message: str | None
    page_count: int | None
    chunk_count: int
    uploaded_by: str | None
    created_at: str
    updated_at: str


class CurriculumDocumentListResponse(BaseModel):
    documents: list[CurriculumDocumentResponse]
    total: int


class CurriculumChunkResponse(BaseModel):
    id: str
    chunk_index: int
    content: str
    heading_hierarchy: str | None  # JSON string
    section_title: str | None
    page_numbers: str | None
    similarity_score: float | None = None


class CurriculumSearchResult(BaseModel):
    chunk: CurriculumChunkResponse
    document_filename: str
    document_education_level: str | None
    document_subject_name: str | None


class CurriculumSearchResponse(BaseModel):
    results: list[CurriculumSearchResult]
    query: str


class ComplianceResult(BaseModel):
    question_index: int
    question_text_snippet: str
    matched_requirements: list[dict]


class ComplianceResponse(BaseModel):
    questions: list[ComplianceResult]
    coverage_summary: dict
    generated_at: str
```

### 4.3 New Service: `curriculum_service.py`

**File:** `backend/app/services/curriculum_service.py`

This is the core service handling the full pipeline: upload → extract → chunk → embed → search.

#### 4.3.1 PDF-to-Markdown Conversion

```python
def convert_pdf_to_markdown(pdf_path: str, output_dir: str) -> str:
    """
    Convert a PDF to Markdown using markdrop.
    Returns the path to the generated .md file.
    """
    from markdrop import markdrop
    markdrop(pdf_path, output_dir)
    # markdrop outputs to output_dir with .md extension
    # Find and return the generated .md file path
```

**Fallback:** If markdrop fails (corrupt PDF, encrypted), fall back to PyMuPDF-based extraction with `markdownify` for structure preservation — similar to the existing `file_service.py` pattern.

#### 4.3.2 Text Chunking

```python
def chunk_markdown(markdown_content: str, chunk_size: int = 1000, chunk_overlap: int = 200) -> list[dict]:
    """
    Split Markdown into chunks preserving heading hierarchy.
    Returns list of dicts: {content, heading_hierarchy, section_title, page_info}.
    """
    from langchain_text_splitters import MarkdownHeaderTextSplitter, RecursiveCharacterTextSplitter

    # Step 1: Split by markdown headers to capture structure
    headers_to_split_on = [
        ("#", "h1"),
        ("##", "h2"),
        ("###", "h3"),
        ("####", "h4"),
    ]
    header_splitter = MarkdownHeaderTextSplitter(headers_to_split_on=headers_to_split_on)
    header_splits = header_splitter.split_text(markdown_content)

    # Step 2: Further split large sections by character count
    char_splitter = RecursiveCharacterTextSplitter(
        chunk_size=chunk_size,
        chunk_overlap=chunk_overlap,
        separators=["\n\n", "\n", ". ", " "]
    )

    chunks = []
    for doc in header_splits:
        sub_chunks = char_splitter.split_text(doc.page_content)
        for sub in sub_chunks:
            chunks.append({
                "content": sub,
                "heading_hierarchy": json.dumps(
                    [doc.metadata.get(h, "") for h in ["h1", "h2", "h3", "h4"] if doc.metadata.get(h)],
                    ensure_ascii=False
                ),
                "section_title": doc.metadata.get("h3") or doc.metadata.get("h2") or doc.metadata.get("h1", ""),
            })
    return chunks
```

**Chunk size rationale:** 1000 characters with 200 overlap keeps curriculum requirements intact (typical requirement is 1-3 sentences, ~100-400 chars) while providing enough context for meaningful embedding. The overlap prevents splitting mid-requirement.

#### 4.3.3 Embedding Generation

```python
def generate_embedding(text: str, api_key: str) -> list[float]:
    """
    Generate embedding via OpenRouter using text-embedding-3-small.
    Returns 1536-dimensional vector.
    """
    import requests

    response = requests.post(
        "https://openrouter.ai/api/v1/embeddings",
        headers={
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json",
        },
        json={
            "model": "openai/text-embedding-3-small",
            "input": text,
        },
        timeout=30,
    )
    response.raise_for_status()
    return response.json()["data"][0]["embedding"]


def generate_embeddings_batch(texts: list[str], api_key: str) -> list[list[float]]:
    """
    Batch embedding generation for efficiency.
    OpenRouter/OpenAI supports up to 2048 inputs per batch.
    """
    import requests

    BATCH_SIZE = 100  # conservative batch size
    all_embeddings = []

    for i in range(0, len(texts), BATCH_SIZE):
        batch = texts[i:i + BATCH_SIZE]
        response = requests.post(
            "https://openrouter.ai/api/v1/embeddings",
            headers={
                "Authorization": f"Bearer {api_key}",
                "Content-Type": "application/json",
            },
            json={
                "model": "openai/text-embedding-3-small",
                "input": batch,
            },
            timeout=60,
        )
        response.raise_for_status()
        data = response.json()["data"]
        # Sort by index to preserve order
        data.sort(key=lambda x: x["index"])
        all_embeddings.extend([d["embedding"] for d in data])

    return all_embeddings
```

#### 4.3.4 Vector Search

```python
def search_similar_chunks(
    db: Session,
    query_embedding: list[float],
    top_k: int = 5,
    education_level: str | None = None,
    subject_name: str | None = None,
    similarity_threshold: float = 0.3,
) -> list[dict]:
    """
    Find the most similar curriculum chunks via cosine similarity.
    Optionally filter by education_level and subject_name.
    """
    embedding_str = "[" + ",".join(str(v) for v in query_embedding) + "]"

    filters = ["cd.status = 'ready'"]
    params = {"embedding": embedding_str, "top_k": top_k, "threshold": similarity_threshold}

    if education_level:
        filters.append("cd.education_level = :education_level")
        params["education_level"] = education_level
    if subject_name:
        filters.append("cd.subject_name = :subject_name")
        params["subject_name"] = subject_name

    where_clause = " AND ".join(filters)

    query = text(f"""
        SELECT
            cc.id, cc.chunk_index, cc.content, cc.heading_hierarchy,
            cc.section_title, cc.page_numbers, cc.metadata_json,
            cd.filename AS document_filename,
            cd.education_level AS document_education_level,
            cd.subject_name AS document_subject_name,
            1 - (cc.embedding <=> :embedding::vector) AS similarity_score
        FROM curriculum_chunks cc
        JOIN curriculum_documents cd ON cc.document_id = cd.id
        WHERE {where_clause}
          AND cc.embedding IS NOT NULL
        ORDER BY cc.embedding <=> :embedding::vector
        LIMIT :top_k
    """)

    results = db.execute(query, params).fetchall()
    return [
        {
            "id": r.id,
            "chunk_index": r.chunk_index,
            "content": r.content,
            "heading_hierarchy": r.heading_hierarchy,
            "section_title": r.section_title,
            "page_numbers": r.page_numbers,
            "document_filename": r.document_filename,
            "document_education_level": r.document_education_level,
            "document_subject_name": r.document_subject_name,
            "similarity_score": r.similarity_score,
        }
        for r in results
        if r.similarity_score >= similarity_threshold
    ]
```

#### 4.3.5 Full Processing Pipeline (Background Task)

```python
def process_curriculum_document(db: Session, document_id: str):
    """
    Background task: PDF → Markdown → Chunks → Embeddings → Store.
    """
    doc = db.query(CurriculumDocument).filter_by(id=document_id).first()
    if not doc:
        return

    try:
        doc.status = "processing"
        db.commit()

        # 1. Get admin's API key for embedding generation
        api_key = _get_admin_api_key(db, doc.uploaded_by)
        if not api_key:
            raise ValueError("No active API key found for embedding generation")

        # 2. Convert PDF to Markdown
        output_dir = os.path.join(settings.data_path, "curriculum", doc.id)
        os.makedirs(output_dir, exist_ok=True)
        md_path = convert_pdf_to_markdown(doc.file_path, output_dir)
        doc.markdown_path = md_path

        with open(md_path, "r", encoding="utf-8") as f:
            markdown_content = f.read()

        # 3. Chunk the Markdown
        chunks = chunk_markdown(markdown_content)

        # 4. Compute content hashes; skip chunks that already exist
        new_chunks = []
        for i, chunk in enumerate(chunks):
            content_hash = hashlib.sha256(chunk["content"].encode()).hexdigest()
            existing = db.query(CurriculumChunk).filter_by(
                document_id=document_id, content_hash=content_hash
            ).first()
            if not existing:
                new_chunks.append((i, chunk, content_hash))

        # 5. Generate embeddings for new chunks (batch)
        if new_chunks:
            texts_to_embed = [c[1]["content"] for c in new_chunks]
            embeddings = generate_embeddings_batch(texts_to_embed, api_key)

            # 6. Store chunks with embeddings
            for (idx, (i, chunk, content_hash)), emb in zip(enumerate(new_chunks), embeddings):
                chunk_model = CurriculumChunk(
                    id=str(uuid.uuid4()),
                    document_id=document_id,
                    chunk_index=i,
                    content=chunk["content"],
                    content_hash=content_hash,
                    heading_hierarchy=chunk.get("heading_hierarchy"),
                    section_title=chunk.get("section_title"),
                    page_numbers=chunk.get("page_numbers"),
                    created_at=datetime.utcnow().isoformat(),
                )
                db.add(chunk_model)
                db.flush()

                # Store embedding via raw SQL (pgvector)
                embedding_str = "[" + ",".join(str(v) for v in emb) + "]"
                db.execute(
                    text("UPDATE curriculum_chunks SET embedding = :emb::vector WHERE id = :id"),
                    {"emb": embedding_str, "id": chunk_model.id}
                )

        doc.chunk_count = len(chunks)
        doc.status = "ready"
        doc.updated_at = datetime.utcnow().isoformat()
        db.commit()

        logger.info(f"Curriculum document {document_id} processed: {len(chunks)} chunks, {len(new_chunks)} new embeddings")

    except Exception as e:
        db.rollback()
        doc.status = "error"
        doc.error_message = str(e)[:1000]
        doc.updated_at = datetime.utcnow().isoformat()
        db.commit()
        logger.error(f"Curriculum document processing failed: {e}", exc_info=True)
```

#### 4.3.6 Compliance Check (Per-Question RAG)

```python
def check_compliance(
    db: Session,
    questions_json: str,
    education_level: str,
    subject_name: str | None,
    api_key: str,
) -> dict:
    """
    For each question in the generation, find matching curriculum requirements.
    Returns compliance mapping with similarity scores.
    """
    questions = json.loads(questions_json)
    results = []

    for i, q in enumerate(questions):
        question_text = q.get("question", q.get("content", ""))
        if not question_text:
            continue

        # Generate embedding for the question
        q_embedding = generate_embedding(question_text, api_key)

        # Search for similar curriculum chunks
        matches = search_similar_chunks(
            db=db,
            query_embedding=q_embedding,
            top_k=3,
            education_level=education_level,
            subject_name=subject_name,
            similarity_threshold=0.4,
        )

        results.append({
            "question_index": i,
            "question_text_snippet": question_text[:100],
            "matched_requirements": [
                {
                    "chunk_id": m["id"],
                    "requirement_code": _extract_requirement_code(m["heading_hierarchy"], m["section_title"]),
                    "requirement_text": m["content"][:300],
                    "similarity_score": round(m["similarity_score"], 3),
                    "section_title": m["section_title"],
                    "page_numbers": m["page_numbers"],
                }
                for m in matches
            ],
        })

    matched_count = sum(1 for r in results if r["matched_requirements"])
    unique_chunks = set()
    for r in results:
        for m in r["matched_requirements"]:
            unique_chunks.add(m["chunk_id"])

    return {
        "questions": results,
        "coverage_summary": {
            "matched_questions": matched_count,
            "total_questions": len(results),
            "unique_requirements_covered": len(unique_chunks),
        },
        "generated_at": datetime.utcnow().isoformat(),
    }
```

### 4.4 New Router: `curriculum.py`

**File:** `backend/app/routers/curriculum.py`

```
# === Public Endpoints (no auth required) ===

GET  /api/curriculum/documents
     → List all curriculum documents with status="ready"
     → Response: CurriculumDocumentListResponse
     → Query params: education_level (optional), subject_name (optional)

GET  /api/curriculum/documents/{document_id}
     → Get single document details
     → Response: CurriculumDocumentResponse

GET  /api/curriculum/documents/{document_id}/download
     → Download original PDF file
     → Response: FileResponse (streaming)


# === Admin Endpoints (superuser required) ===

POST /api/curriculum/documents
     → Upload new curriculum PDF
     → Form data: file (PDF), education_level, subject_name, description
     → Triggers background processing pipeline
     → Response: CurriculumDocumentResponse (201)

DELETE /api/curriculum/documents/{document_id}
     → Delete curriculum document and all its chunks
     → Response: 204

GET  /api/curriculum/documents/{document_id}/status
     → Poll processing status (for admin UI progress tracking)
     → Response: { status, chunk_count, error_message }

POST /api/curriculum/documents/{document_id}/reprocess
     → Re-run processing pipeline (useful after markdrop/splitter updates)
     → Deletes existing chunks, re-generates
     → Response: CurriculumDocumentResponse


# === Authenticated Endpoints (any logged-in user) ===

POST /api/curriculum/search
     → Vector similarity search against curriculum
     → Body: { query: str, education_level?: str, subject_name?: str, top_k?: int }
     → Response: CurriculumSearchResponse

POST /api/curriculum/compliance/{generation_id}
     → Run compliance check on a generation's questions
     → Uses generation's education_level and subject as filters
     → Stores result in prototype.compliance_json
     → Response: ComplianceResponse
```

### 4.5 Modifications to Existing Services

#### 4.5.1 `ai_service.py` — Inject Curriculum Context in Prompts

**Modification:** In `build_system_prompt()`, after injecting source texts, add a new section with relevant curriculum requirements retrieved via RAG.

```python
def build_system_prompt(generation, source_texts, curriculum_context=None):
    # ... existing prompt building ...

    if curriculum_context:
        prompt += "\n\n--- PODSTAWA PROGRAMOWA (wymagania ministerialne) ---\n"
        prompt += "Poniższe fragmenty pochodzą z oficjalnej Podstawy Programowej. "
        prompt += "Każde pytanie powinno realizować co najmniej jedno z poniższych wymagań. "
        prompt += "W odpowiedzi JSON, dla każdego pytania dodaj pole 'curriculum_ref' "
        prompt += "z numerem wymagania, które to pytanie realizuje.\n\n"
        for ctx in curriculum_context:
            section = ctx.get("section_title", "")
            content = ctx.get("content", "")
            prompt += f"[{section}]\n{content}\n\n"

    # ... rest of prompt ...
```

**Important:** The `curriculum_ref` field in the AI response provides an AI-level mapping, while the vector-search provides a verification-level mapping. Both are stored: AI response in `raw_questions_json`, vector match in `compliance_json`.

#### 4.5.2 `generation_service.py` — Trigger RAG Pipeline

**Modification:** In `generate_prototype_task()`, before calling `build_system_prompt()`:

```python
# After fetching generation and source texts, before prompt building:
curriculum_context = None
if generation.curriculum_compliance_enabled:
    try:
        # Get topic embedding
        topic_embedding = generate_embedding(generation.topic, api_key)

        # Search curriculum for relevant requirements
        matches = search_similar_chunks(
            db=db,
            query_embedding=topic_embedding,
            top_k=10,
            education_level=generation.education_level,
        )
        if matches:
            curriculum_context = matches
    except Exception as e:
        logger.warning(f"Curriculum context retrieval failed: {e}")
        # Non-fatal — generation proceeds without curriculum context

# Pass curriculum_context to prompt builder
system_prompt = build_system_prompt(generation, source_texts, curriculum_context)
```

#### 4.5.3 `docx_service.py` — Compliance Table in Export

**Modification:** When generating the DOCX document, if `prototype.compliance_json` exists and the user opted for it:

```python
def _add_compliance_table(document, compliance_data):
    """
    Append a compliance table at the end of the DOCX document.
    Maps each question to its curriculum requirement.
    """
    document.add_page_break()
    document.add_heading("Metryczka zgodności z Podstawą Programową", level=2)

    table = document.add_table(rows=1, cols=3, style="Table Grid")
    headers = table.rows[0].cells
    headers[0].text = "Zadanie"
    headers[1].text = "Punkt Podstawy Programowej"
    headers[2].text = "Treść wymagania"

    for q in compliance_data.get("questions", []):
        for match in q.get("matched_requirements", [])[:1]:  # top match only
            row = table.add_row().cells
            row[0].text = f"Zad. {q['question_index'] + 1}"
            row[1].text = match.get("requirement_code", "—")
            row[2].text = match.get("requirement_text", "—")[:200]
```

### 4.6 Model Registration

#### `backend/app/models/__init__.py` — Add imports

```python
from app.models.curriculum_document import CurriculumDocument
from app.models.curriculum_chunk import CurriculumChunk
```

### 4.7 Router Registration

#### `backend/app/main.py` — Register curriculum router

```python
from app.routers import curriculum

app.include_router(curriculum.router, prefix="/api")
```

---

## 5. Frontend Implementation

### 5.1 New Types

#### `frontend/src/types/index.ts` — Additions

```typescript
export interface CurriculumDocument {
  id: string;
  filename: string;
  original_filename: string;
  file_size: number;
  file_hash: string;
  education_level: string | null;
  subject_name: string | null;
  description: string | null;
  status: 'uploaded' | 'processing' | 'ready' | 'error';
  error_message: string | null;
  page_count: number | null;
  chunk_count: number;
  uploaded_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface CurriculumSearchResult {
  chunk: {
    id: string;
    chunk_index: number;
    content: string;
    heading_hierarchy: string | null;
    section_title: string | null;
    page_numbers: string | null;
    similarity_score: number | null;
  };
  document_filename: string;
  document_education_level: string | null;
  document_subject_name: string | null;
}

export interface ComplianceResult {
  questions: Array<{
    question_index: number;
    question_text_snippet: string;
    matched_requirements: Array<{
      chunk_id: string;
      requirement_code: string;
      requirement_text: string;
      similarity_score: number;
      section_title: string;
      page_numbers: string | null;
    }>;
  }>;
  coverage_summary: {
    matched_questions: number;
    total_questions: number;
    unique_requirements_covered: number;
  };
  generated_at: string;
}
```

### 5.2 New Hook: `useCurriculum.ts`

**File:** `frontend/src/hooks/useCurriculum.ts`

```typescript
// Hook pattern consistent with existing useFiles.ts, useSubjects.ts

export function useCurriculum(filters?: { education_level?: string; subject_name?: string }) {
  // Query: GET /api/curriculum/documents (with optional filters)
  // Mutations:
  //   uploadDocument: POST /api/curriculum/documents (multipart)
  //   deleteDocument: DELETE /api/curriculum/documents/{id}
  //   downloadDocument: GET /api/curriculum/documents/{id}/download (blob)
  //   reprocessDocument: POST /api/curriculum/documents/{id}/reprocess
  // Polling: refetchInterval when any document has status != 'ready' && != 'error'
  // Returns: { documents, isLoading, uploadDocument, deleteDocument, ... }
}

export function useCurriculumCompliance(generationId: string) {
  // Mutation: POST /api/curriculum/compliance/{generationId}
  // Returns: { runCompliance, complianceData, isLoading }
}
```

### 5.3 New Pages

#### 5.3.1 Public Curriculum Page: `/state-documents/pp`

**File:** `frontend/src/app/state-documents/pp/page.tsx`

This is a **public** page (no auth required). Must be added to middleware public routes.

**UI Design:**
- Page title: "Podstawa Programowa — Źródła danych"
- Subtitle explaining that the system uses official MEN curriculum documents
- Filter controls: education level dropdown, subject dropdown
- Document list as MUI `Card` grid:
  - Each card shows: filename, education level (Chip), subject (Chip), upload date, chunk count, page count
  - Download button (PDF) for each document
  - Status badge (Chip: ready = green, processing = yellow, error = red)
- EmptyState if no documents available
- Layout: wrapped in `PublicChrome` (consistent with other public pages)

#### 5.3.2 Admin Curriculum Management: `/admin-panel/curriculum`

**File:** `frontend/src/app/(authenticated)/admin-panel/curriculum/page.tsx`

**UI Design:**
- Protected by `useAdminAccess()` hook
- Upload section at top:
  - Drag-and-drop zone (reuse pattern from `FileUploader.tsx`)
  - Form fields: education level (dropdown), subject name (Autocomplete), description (text)
  - Accept only PDF files
- Document table below:
  - Columns: filename, education level, subject, status, chunks, upload date, actions
  - Actions: Download, Reprocess, Delete (with confirmation dialog)
  - Polling: auto-refresh every 5s when any document is processing
  - Status column: colored Chip (uploaded=grey, processing=orange with spinner, ready=green, error=red with tooltip)

### 5.4 Admin Panel Tile

#### Modify `frontend/src/app/(authenticated)/admin-panel/page.tsx`

Add a new tile card for "Podstawa Programowa" that navigates to `/admin-panel/curriculum`:

```typescript
{
  title: 'Podstawa Programowa',
  description: 'Zarządzanie dokumentami Podstawy Programowej',
  icon: <MenuBookIcon />,
  href: '/admin-panel/curriculum',
  enabled: true,
}
```

### 5.5 Sidebar Navigation

#### Modify `frontend/src/components/layout/Sidebar.tsx`

Add a new menu item for the public curriculum page (visible to all authenticated users):

```typescript
{
  label: 'Podstawa Programowa',
  icon: <MenuBookIcon />,
  path: '/state-documents/pp',
}
```

### 5.6 Generation Wizard — Compliance Toggle

#### Modify `frontend/src/components/generate/StepReview.tsx`

Add a checkbox/switch in the review step:

```
☑ Weryfikuj zgodność z Podstawą Programową
  (System sprawdzi, czy wygenerowane pytania realizują wymagania ministerialne)
```

This sets `curriculum_compliance_enabled: true` in the generation request body.

**Visibility condition:** Only shown when `curriculum_documents` exist (query the public list endpoint). If no curriculum documents are uploaded, hide the toggle with a helper text: "Brak dokumentów Podstawy Programowej. Administrator musi je wgrać."

#### Modify `frontend/src/components/generate/StepSubjectConfig.tsx`

In the future (Phase 3+), add a "Luki w materiale" (Gap Analysis) section here that displays which curriculum areas are NOT covered by the selected source files. This requires comparing source file embeddings against curriculum embeddings — deferred to later phases.

### 5.7 Editor — Compliance Badges

#### Modify `frontend/src/app/(authenticated)/generate/[id]/editor/page.tsx`

After prototype loads, if `compliance_json` is present:

- Display a collapsible sidebar/panel titled "Zgodność z PP" (Curriculum Compliance)
- For each question, show:
  - Matched requirement code (e.g., "II.1.2") as a `Chip`
  - Requirement text as a tooltip
  - Similarity score as a small badge (e.g., 91%)
  - Color coding: ≥0.7 = green, 0.5-0.7 = yellow, <0.5 = orange
- Coverage summary at top: "8/10 pytań powiązanych z PP" with progress bar
- Button: "Uruchom weryfikację" — triggers `POST /api/curriculum/compliance/{generation_id}` if not yet run

#### New Component: `frontend/src/components/editor/ComplianceSidebar.tsx`

```typescript
interface ComplianceSidebarProps {
  complianceData: ComplianceResult | null;
  onRunCompliance: () => void;
  isLoading: boolean;
  isAvailable: boolean;  // false if no curriculum docs exist
}
```

- Renders as a right-side drawer or collapsible panel
- Shows compliance per question in an accordion/list
- Each item expands to show matched curriculum text
- "Eksportuj raport" button at bottom — triggers finalize with compliance table

### 5.8 Middleware Update

#### Modify `frontend/src/proxy.ts`

Add `/state-documents` to the public routes array:

```typescript
const publicRoutes = ['/', '/about', '/login', '/register', '/state-documents'];
```

### 5.9 Next.js Config — API Proxy

#### Modify `frontend/next.config.ts`

Add rewrite for the new API route (if not already covered by the existing `/api/:path*` pattern — verify existing config).

---

## 6. Infrastructure Changes

### 6.1 Docker Compose

#### Modify `docker-compose.yml`

**Change PostgreSQL image to pgvector:**

```yaml
services:
  postgres:
    image: pgvector/pgvector:pg16
    # ... rest unchanged ...
```

The `pgvector/pgvector:pg16` image is the official PostgreSQL 16 image with pgvector pre-installed. It's a drop-in replacement for `postgres:16` — no other changes needed.

**Add curriculum data volume mount to backend:**

```yaml
services:
  backend:
    volumes:
      - edugen_data:/app/data       # existing
      # data/curriculum/ will be created inside edugen_data
```

No new volume needed — curriculum PDFs and markdown files stored under `DATA_DIR/curriculum/`.

### 6.2 Backend Dockerfile

#### Modify `backend/Dockerfile`

Add system dependencies for markdrop (PDF processing):

```dockerfile
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl build-essential pandoc fonts-dejavu-core fontconfig \
    poppler-utils \    # NEW: required by markdrop for PDF parsing
    && rm -rf /var/lib/apt/lists/*
```

### 6.3 Python Dependencies

#### Modify `backend/pyproject.toml`

```toml
dependencies = [
    # ... existing ...
    "markdrop>=0.1.0",
    "langchain-text-splitters>=0.2.0",
    "pgvector>=0.3.0",
]
```

### 6.4 Init Script

#### Modify `backend/app/init_app.py`

Add curriculum directory to `ensure_directories()`:

```python
def ensure_directories():
    dirs = [
        settings.data_path,
        settings.data_path / "subjects",
        settings.data_path / "documents",
        settings.data_path / "backups",
        settings.data_path / "curriculum",  # NEW
    ]
    for d in dirs:
        d.mkdir(parents=True, exist_ok=True)
```

---

## 7. RAG Pipeline Design

### 7.1 Full Pipeline Flow

```
┌─────────────────────────────────────────────────────────────────────┐
│                    CURRICULUM INGESTION PIPELINE                    │
│                                                                     │
│  Admin uploads PDF                                                  │
│       │                                                             │
│       ▼                                                             │
│  [Save PDF to disk] → data/curriculum/{doc_id}/original.pdf         │
│       │                                                             │
│       ▼                                                             │
│  [markdrop] PDF → Markdown                                          │
│       │       → data/curriculum/{doc_id}/content.md                 │
│       ▼                                                             │
│  [MarkdownHeaderTextSplitter] → Structural splits (by headings)     │
│       │                                                             │
│       ▼                                                             │
│  [RecursiveCharacterTextSplitter] → 1000-char chunks with overlap   │
│       │                                                             │
│       ▼                                                             │
│  [Hash each chunk] → SHA-256 content_hash                           │
│       │                                                             │
│       ├── Hash exists in DB? → Skip (cache hit)                     │
│       │                                                             │
│       ▼                                                             │
│  [OpenRouter Embedding API] → text-embedding-3-small (dim 1536)     │
│       │       → Batch of 100 chunks per request                     │
│       ▼                                                             │
│  [Store in curriculum_chunks] → content + embedding + metadata      │
│       │                                                             │
│       ▼                                                             │
│  Document status: "ready"                                           │
└─────────────────────────────────────────────────────────────────────┘
```

### 7.2 Generation-Time RAG Flow

```
┌─────────────────────────────────────────────────────────────────────┐
│                    GENERATION RAG PIPELINE                          │
│                                                                     │
│  User creates generation with curriculum_compliance_enabled=true    │
│       │                                                             │
│       ▼                                                             │
│  [Embed generation.topic] → query vector                            │
│       │                                                             │
│       ▼                                                             │
│  [pgvector cosine search] → top 10 curriculum chunks                │
│       │  (filtered by education_level)                              │
│       ▼                                                             │
│  [Inject into system prompt] → "PODSTAWA PROGRAMOWA" section        │
│       │                                                             │
│       ▼                                                             │
│  [AI generates questions] → includes curriculum_ref per question    │
│       │                                                             │
│       ▼                                                             │
│  [Store prototype] → original_content, raw_questions_json           │
│                                                                     │
│  === POST-GENERATION (triggered separately by user) ===             │
│                                                                     │
│  [Embed each question text] → per-question vectors                  │
│       │                                                             │
│       ▼                                                             │
│  [pgvector cosine search per question] → top 3 matches each         │
│       │                                                             │
│       ▼                                                             │
│  [Store compliance_json in prototype]                               │
│       │                                                             │
│       ▼                                                             │
│  [Display in ComplianceSidebar]                                     │
└─────────────────────────────────────────────────────────────────────┘
```

### 7.3 Embedding Caching Strategy

The `content_hash` field on `curriculum_chunks` acts as the cache key:

1. When processing a document, compute SHA-256 of each chunk's text content.
2. Before generating an embedding, check if a chunk with this `content_hash` already exists **for this document**.
3. If yes → skip embedding generation (cache hit).
4. If no → generate embedding via API.

This handles:
- **Re-processing** the same document: all hashes match → no API calls.
- **Updated document** with minor changes: only changed chunks re-embedded.
- **Completely different document**: all new hashes → all chunks embedded.

**Cost estimation:** `text-embedding-3-small` costs $0.0001 per 1000 tokens (~750 words). With 1000-char chunks (~200 tokens), each embedding costs ~$0.00002. For a 50-page curriculum with ~20 chunks/page = 1000 chunks → $0.02 per document. Caching ensures that re-processing or similar documents incur minimal additional cost.

---

## 8. Integration with Generation Flow

### 8.1 GenerationCreate Schema Change

#### Modify `backend/app/schemas/generation.py`

```python
class GenerationCreate(BaseModel):
    # ... existing fields ...
    curriculum_compliance_enabled: bool = False
```

### 8.2 Generation Router Change

#### Modify `backend/app/routers/generations.py`

In `POST /api/generations`:

```python
# After creating generation model, before background task:
generation.curriculum_compliance_enabled = body.curriculum_compliance_enabled
```

### 8.3 Generation Service Change

#### Modify `backend/app/services/generation_service.py`

In `generate_prototype_task()`, between fetching source texts and building the prompt:

```python
# Retrieve curriculum context if enabled
curriculum_context = None
if generation.curriculum_compliance_enabled:
    try:
        from app.services.curriculum_service import generate_embedding, search_similar_chunks
        topic_embedding = generate_embedding(generation.topic, api_key)
        curriculum_context = search_similar_chunks(
            db=db,
            query_embedding=topic_embedding,
            top_k=10,
            education_level=generation.education_level,
        )
    except Exception as e:
        logger.warning(f"Curriculum RAG failed (non-fatal): {e}")
```

Then pass `curriculum_context` to `build_system_prompt()`.

### 8.4 AI Response Schema Extension

For question-based content types, the AI JSON response should include an optional `curriculum_ref` field per question:

```json
{
  "questions": [
    {
      "question": "Wskaż podmiot w zdaniu...",
      "type": "open",
      "answer": "...",
      "curriculum_ref": "II.1.2 — Uczeń rozpoznaje i nazywa części mowy"
    }
  ]
}
```

This is achieved by adding the instruction to the prompt (see section 4.5.1). The field is optional — if the AI can't map, it returns `null`.

---

## 9. File Structure Changes

### 9.1 New Files

```
backend/
├── app/
│   ├── models/
│   │   ├── curriculum_document.py          # NEW
│   │   └── curriculum_chunk.py             # NEW
│   ├── routers/
│   │   └── curriculum.py                   # NEW
│   ├── schemas/
│   │   └── curriculum.py                   # NEW
│   └── services/
│       └── curriculum_service.py           # NEW
├── alembic/
│   └── versions/
│       └── 004_add_curriculum_tables.py    # NEW

frontend/
├── src/
│   ├── app/
│   │   ├── state-documents/
│   │   │   └── pp/
│   │   │       └── page.tsx                # NEW (public)
│   │   └── (authenticated)/
│   │       └── admin-panel/
│   │           └── curriculum/
│   │               └── page.tsx            # NEW
│   ├── components/
│   │   ├── curriculum/
│   │   │   ├── CurriculumDocumentList.tsx   # NEW
│   │   │   ├── CurriculumUploader.tsx       # NEW
│   │   │   └── CurriculumDocumentCard.tsx   # NEW
│   │   └── editor/
│   │       └── ComplianceSidebar.tsx         # NEW
│   └── hooks/
│       └── useCurriculum.ts                 # NEW
```

### 9.2 Modified Files

```
backend/
├── app/
│   ├── main.py                              # Register curriculum router
│   ├── init_app.py                          # Add curriculum directory
│   ├── models/__init__.py                   # Export new models
│   ├── services/ai_service.py              # Inject curriculum context in prompts
│   ├── services/generation_service.py       # Trigger RAG pipeline
│   └── services/docx_service.py             # Add compliance table to export
├── pyproject.toml                           # Add new dependencies
├── Dockerfile                               # Add poppler-utils

frontend/
├── src/
│   ├── proxy.ts                             # Add public route
│   ├── types/index.ts                       # Add new types
│   ├── app/(authenticated)/
│   │   ├── admin-panel/page.tsx             # Add curriculum tile
│   │   └── generate/[id]/editor/page.tsx    # Add ComplianceSidebar
│   ├── components/
│   │   ├── generate/StepReview.tsx          # Add compliance toggle
│   │   └── layout/Sidebar.tsx               # Add nav item
│   └── lib/constants.ts                     # Add curriculum-related constants

docker-compose.yml                           # Change postgres image to pgvector
```

---

## 10. Implementation Phases

### Phase 1: Infrastructure & Database Foundation

**Duration priority: First**  
**Dependencies: None**

1. Switch Docker PostgreSQL image from `postgres:16` to `pgvector/pgvector:pg16`
2. Add Python dependencies to `pyproject.toml`: `markdrop`, `langchain-text-splitters`, `pgvector`
3. Update `Dockerfile` with `poppler-utils`
4. Create Alembic migration `004_add_curriculum_tables.py`
5. Create SQLAlchemy models: `CurriculumDocument`, `CurriculumChunk`
6. Register models in `__init__.py`
7. Add `curriculum` directory creation to `init_app.py`
8. Verify migration runs cleanly, pgvector extension activates

**Verification:** Run `alembic upgrade head`, confirm tables exist, confirm `vector` type available in PostgreSQL.

### Phase 2: Curriculum Ingestion Pipeline

**Duration priority: Second**  
**Dependencies: Phase 1**

1. Implement `curriculum_service.py`:
   - `convert_pdf_to_markdown()` — markdrop integration
   - `chunk_markdown()` — langchain text splitters
   - `generate_embedding()` / `generate_embeddings_batch()` — OpenRouter API
   - `process_curriculum_document()` — full background pipeline
   - Caching via `content_hash`
2. Create Pydantic schemas in `schemas/curriculum.py`
3. Implement `routers/curriculum.py`:
   - Admin upload endpoint (`POST /api/curriculum/documents`)
   - Admin delete endpoint (`DELETE /api/curriculum/documents/{id}`)
   - Admin status polling (`GET /api/curriculum/documents/{id}/status`)
   - Admin reprocess (`POST /api/curriculum/documents/{id}/reprocess`)
   - Public document list (`GET /api/curriculum/documents`)
   - Public download (`GET /api/curriculum/documents/{id}/download`)
4. Register router in `main.py`
5. Test with a real Podstawa Programowa PDF

**Verification:** Upload a PDF → confirm Markdown conversion → confirm chunks in DB → confirm embeddings stored → confirm status transitions.

### Phase 3: Vector Search & RAG Integration

**Duration priority: Third**  
**Dependencies: Phase 2**

1. Implement `search_similar_chunks()` in `curriculum_service.py`
2. Implement `check_compliance()` for per-question matching
3. Add search endpoint (`POST /api/curriculum/search`)
4. Add compliance endpoint (`POST /api/curriculum/compliance/{generation_id}`)
5. Modify `ai_service.py` — inject curriculum context into prompts
6. Modify `generation_service.py` — trigger RAG when enabled
7. Modify `GenerationCreate` schema — add `curriculum_compliance_enabled`
8. Modify generations router — pass new field

**Verification:** Create a generation with compliance enabled → confirm curriculum context in AI prompt → confirm `curriculum_ref` in AI response → run compliance check → confirm `compliance_json` stored.

### Phase 4: Frontend — Admin & Public Pages

**Duration priority: Fourth**  
**Dependencies: Phase 2 (backend APIs must exist)**

1. Add types to `types/index.ts`
2. Create `useCurriculum.ts` hook
3. Create public page `/state-documents/pp/page.tsx`
4. Add to middleware public routes
5. Create admin page `/admin-panel/curriculum/page.tsx`
6. Create components: `CurriculumDocumentList`, `CurriculumUploader`, `CurriculumDocumentCard`
7. Add admin panel tile for curriculum management
8. Add Sidebar navigation item

**Verification:** Admin can upload PDF, see processing status, see ready state. Public users can view and download curriculum documents.

### Phase 5: Editor Integration & Compliance UI

**Duration priority: Fifth**  
**Dependencies: Phase 3 + Phase 4**

1. Create `ComplianceSidebar.tsx` component
2. Modify editor page to include compliance sidebar
3. Implement "Uruchom weryfikację" button flow
4. Add compliance toggle to `StepReview.tsx` in generation wizard
5. Display per-question badges with requirement codes
6. Add coverage summary progress bar

**Verification:** Generate material with compliance enabled → open editor → see compliance sidebar → verify requirement codes per question.

### Phase 6: DOCX Export Integration

**Duration priority: Sixth**  
**Dependencies: Phase 5**

1. Modify `docx_service.py` — add `_add_compliance_table()`
2. Add checkbox in finalization flow: "Dołącz metryczkę zgodności"
3. Generate DOCX with compliance table appended
4. Test export with various compliance states

**Verification:** Finalize document with compliance → download DOCX → verify compliance table at end.

### Phase 7: Documentation & Cleanup

**Duration priority: Last**  
**Dependencies: All phases**

1. Create module documentation: `documentation/modules/curriculum_module_documentation.md`
2. Update `documentation/backend_documentation.md`
3. Update `documentation/frontend_documentation.md`
4. Update `documentation/database_documentation.md`
5. Update `README.md` and `INSTRUKCJA_URUCHOMIENIA.md` if infrastructure scripts changed

---

## 11. Potential Problems & Mitigations

### 11.1 Architectural Risks

| Risk | Impact | Mitigation |
|---|---|---|
| pgvector extension not available in Docker | Blocks all vector features | Use official `pgvector/pgvector:pg16` image, test locally before deploy |
| markdrop library stability/compatibility | PDF conversion failures | Implement fallback to PyMuPDF + markdownify; robust error handling per document |
| OpenRouter embedding API availability | Cannot generate embeddings | Cache all embeddings; processing is idempotent; queue for retry |
| Large PDF processing timeout | Background task exceeds limits | Process in background (no HTTP timeout constraint); chunked batch embedding |

### 11.2 Performance Concerns

| Concern | Impact | Mitigation |
|---|---|---|
| HNSW index build time | Slow inserts when index is large | Curriculum docs are finite (~10-50 docs); index build time negligible |
| Multiple embedding API calls per generation | Added latency to generation | Topic embedding is single call (~200ms); compliance check is post-generation (async) |
| Large PDF processing (200+ pages) | Long background task | Status polling UI; processing divided into stages; markdrop handles pagination |
| cosine similarity search on 10K+ chunks | Query latency | HNSW index provides O(log n) search; 10K chunks ≈ <10ms query time |

### 11.3 Data Consistency Risks

| Risk | Mitigation |
|---|---|
| Chunks orphaned after document deletion | CASCADE delete on FK constraint |
| Partial embedding failure (50/100 chunks embedded) | Track per-chunk embedding status; reprocess fills gaps; `content_hash` prevents re-processing already-done chunks |
| Document re-uploaded with different content but same name | Hash-based dedup uses file content hash, not filename; different content → different hash → new document |
| Compliance data stale after prototype edit | `compliance_json` is point-in-time; "Re-run" button available; warn user if prototype was edited after last compliance check |

### 11.4 Security Considerations

| Concern | Mitigation |
|---|---|
| PDF upload attack vectors (path traversal, malicious PDFs) | Validate file type (MIME check), rename to UUID on disk, process in isolated directory |
| Admin-only upload prevents unauthorized data injection | `get_current_superuser()` dependency on upload/delete endpoints |
| API key exposure in embedding calls | Reuse existing encrypted key infrastructure from `secret_keys` table |
| SQL injection via vector search | Parameterized queries with SQLAlchemy `text()` and bound parameters |

### 11.5 Edge Cases

| Edge Case | Handling |
|---|---|
| No curriculum documents uploaded yet | Hide compliance toggle in wizard; show info message |
| Generation with 0 questions (free-form content) | Skip compliance check (no questions to match); hide compliance UI |
| PDF with no extractable text (scanned, image-only) | markdrop handles OCR if available; fallback: mark document as error with message |
| Embedding model changes (dimension mismatch) | Migration/reprocess needed; `reprocess` endpoint handles this; document all active model dimensions |
| Very short chunks (< 50 chars) | Filter out chunks shorter than threshold before embedding; saves API cost |
| Duplicate chunks within same document | `content_hash` with unique constraint prevents duplicates |

---

## 12. Suggested Improvements

### 12.1 Architectural Simplifications

1. **Unified embedding service:** Instead of embedding logic spread across curriculum_service.py, create a dedicated `embedding_service.py` that abstracts the OpenRouter embedding API call, batch processing, and caching. This service can later be reused if source file embedding is needed for gap analysis.

2. **Document processing queue:** Instead of FastAPI background tasks (which are tied to the request lifecycle and single-worker), consider using the existing APScheduler or a simple database-backed queue for document processing. This prevents lost processing if the worker restarts mid-task.

3. **Streaming processing status:** Replace polling with Server-Sent Events (SSE) for document processing status updates — similar to how modern AI apps handle streaming. This is an optimization, not a requirement.

### 12.2 Cleaner Abstractions

1. **`VectorStore` abstract class:** Wrap pgvector operations behind an interface so the system could theoretically swap to a different vector store (ChromaDB, Pinecone) without changing business logic. For now, implement only the pgvector backend.

2. **`DocumentProcessor` pipeline pattern:** Structure the conversion pipeline as a chain of processors (PDFExtractor → MarkdownConverter → TextSplitter → Embedder → Storer) with clear interfaces. Easier to test and extend.

### 12.3 Reusable Components

1. **Frontend `DocumentUploader` generic component:** The `CurriculumUploader` and existing `FileUploader` share 80% of logic. Extract a base `DocumentUploader` component with configurable accept types, size limits, and metadata fields.

2. **`StatusPollingHook` generic hook:** Both `useFiles` and `useCurriculum` implement auto-polling when items are processing. Extract a generic `usePollingQuery` hook.

### 12.4 Data Modeling Improvements

1. **Normalize `heading_hierarchy` as a separate table:** Instead of storing heading hierarchy as a JSON string per chunk, create a `curriculum_sections` table representing the document's TOC structure. Each chunk references its section. This enables searching/filtering by section without JSON parsing. However, this adds significant complexity — the JSON approach is pragmatic and sufficient for v1.

2. **Embedding model versioning:** Add a `model_version` column to `curriculum_chunks` (e.g., `"text-embedding-3-small"`) so that if the embedding model changes, old vectors can be identified and re-generated. Store model identifier in config as well.

### 12.5 Future Extension Points

1. **Gap Analysis (Feature "Luki w materiale"):** Requires embedding source files' extracted text and comparing coverage against curriculum chunks for the selected class/level. Infrastructure built in this plan (embedding service, vector search) directly supports this — the main work is building the comparison UI and the "generate additional question" flow.

2. **Quick Action Buttons in Editor:** ("Utrudnij pod egzamin ósmoklasisty", "Dostosuj dla ucznia z dysleksją") — these are reprompt presets. Can be implemented as predefined prompts stored in a config table and rendered as buttons in the `RepromptInput` component. Orthogonal to this feature but synergistic.

3. **LaTeX and Diagram Support:** Separate feature, but the curriculum module needs to handle mathematical notation in Podstawa Programowa extracts. Ensure `markdrop` preserves LaTeX-like notation during conversion. If not, add a post-processing step.

---

## 13. Testing Plan

### 13.1 Unit Tests

#### Backend — `tests/test_curriculum_service.py`

| Test | Description |
|---|---|
| `test_chunk_markdown_basic` | Verify Markdown with headers splits into correct chunks |
| `test_chunk_markdown_preserves_hierarchy` | Verify heading hierarchy captured in chunk metadata |
| `test_chunk_markdown_overlap` | Verify chunk overlap works correctly |
| `test_chunk_markdown_empty_input` | Handle empty/whitespace-only Markdown |
| `test_chunk_markdown_no_headers` | Handle Markdown without header structure |
| `test_content_hash_deterministic` | Same content → same hash |
| `test_content_hash_different` | Different content → different hash |
| `test_extract_requirement_code` | Parse requirement codes from hierarchy |
| `test_compliance_check_with_matches` | Verify compliance correctly maps questions to requirements |
| `test_compliance_check_no_matches` | Handle questions with no curriculum match (below threshold) |
| `test_compliance_coverage_summary` | Verify coverage counting logic |

#### Backend — `tests/test_curriculum_router.py`

| Test | Description |
|---|---|
| `test_list_documents_public` | GET /api/curriculum/documents returns only ready documents (no auth) |
| `test_list_documents_filter_education_level` | Filter by education level |
| `test_upload_requires_superuser` | POST returns 403 for non-admin |
| `test_upload_valid_pdf` | Admin can upload PDF; status=uploaded |
| `test_upload_duplicate_hash` | Same file re-uploaded returns 409 |
| `test_upload_non_pdf` | Non-PDF file rejected (422) |
| `test_delete_requires_superuser` | DELETE returns 403 for non-admin |
| `test_delete_cascades_chunks` | Deleting document removes chunks |
| `test_download_document` | GET download endpoint streams file |
| `test_search_requires_auth` | POST /search returns 401 without token |
| `test_search_returns_results` | Search with valid query returns ranked results |
| `test_compliance_check` | POST compliance/{id} computes and stores compliance_json |
| `test_compliance_no_curriculum_docs` | Compliance returns empty results gracefully |
| `test_status_polling` | GET status endpoint returns current processing status |

#### Frontend — `tests/useCurriculum.test.ts`

| Test | Description |
|---|---|
| `test_fetches_documents` | Hook fetches document list |
| `test_polling_when_processing` | Auto-refetch when documents are processing |
| `test_upload_mutation` | Upload triggers POST with FormData |
| `test_delete_mutation` | Delete triggers DELETE and invalidates cache |

### 13.2 Integration Tests

| Test | Description |
|---|---|
| `test_full_ingestion_pipeline` | Upload PDF → verify Markdown created → verify chunks in DB → verify embeddings stored |
| `test_generation_with_curriculum_context` | Create generation with compliance enabled → verify curriculum context in AI prompt |
| `test_compliance_after_generation` | Generate → run compliance → verify compliance_json stored |
| `test_docx_export_with_compliance` | Finalize with compliance → download DOCX → verify compliance table present |
| `test_reprocess_document` | Upload → ready → reprocess → verify chunks regenerated |
| `test_pgvector_similarity_search` | Insert known embeddings → search → verify cosine ranking correct |

### 13.3 End-to-End Tests (Playwright)

| Test | Description |
|---|---|
| `test_admin_uploads_curriculum_pdf` | Admin navigates to curriculum management → uploads PDF → sees processing status → sees ready state |
| `test_public_views_curriculum_documents` | Unauthenticated user visits /state-documents/pp → sees document list → can download PDF |
| `test_generation_with_compliance_toggle` | User enables compliance toggle in wizard → generates → sees compliance sidebar in editor |
| `test_compliance_sidebar_interactions` | User clicks "Uruchom weryfikację" → sees results → expands question details → sees requirement codes |
| `test_finalize_with_compliance_report` | User checks "Dołącz metryczkę" → finalizes → downloads DOCX with compliance table |

### 13.4 Edge Case Coverage

| Test | Description |
|---|---|
| `test_large_pdf_processing` | Upload 200+ page PDF; verify chunking completes |
| `test_corrupted_pdf_handling` | Upload corrupt PDF; verify error status and message |
| `test_embedding_api_failure` | Simulate OpenRouter outage; verify error status, no partial data |
| `test_concurrent_document_upload` | Two admins upload simultaneously; verify no race conditions |
| `test_zero_chunks_after_processing` | PDF with no extractable text; verify appropriate error |
| `test_search_with_empty_database` | Search when no documents exist; verify empty results (not error) |
| `test_compliance_on_free_form_content` | Run compliance on lesson_materials type; verify graceful skip |

---

## Appendix A: API Endpoint Summary

| Method | Path | Auth | Description |
|---|---|---|---|
| `GET` | `/api/curriculum/documents` | None | List ready curriculum documents |
| `GET` | `/api/curriculum/documents/{id}` | None | Get document details |
| `GET` | `/api/curriculum/documents/{id}/download` | None | Download original PDF |
| `POST` | `/api/curriculum/documents` | Superuser | Upload new curriculum PDF |
| `DELETE` | `/api/curriculum/documents/{id}` | Superuser | Delete document + chunks |
| `GET` | `/api/curriculum/documents/{id}/status` | Superuser | Poll processing status |
| `POST` | `/api/curriculum/documents/{id}/reprocess` | Superuser | Re-run processing pipeline |
| `POST` | `/api/curriculum/search` | User | Vector similarity search |
| `POST` | `/api/curriculum/compliance/{generation_id}` | User | Run compliance check |

## Appendix B: Environment Variables

No new environment variables required. The feature uses:
- Existing `DATABASE_URL` (PostgreSQL with pgvector)
- Existing `DATA_DIR` (curriculum files stored under `DATA_DIR/curriculum/`)
- Existing user API keys from `secret_keys` table for embedding generation
- OpenRouter API (same base URL as existing AI service)

## Appendix C: Embedding Model Specification

| Property | Value |
|---|---|
| Model | `openai/text-embedding-3-small` |
| Provider | OpenRouter |
| Dimensions | 1536 |
| Max Input Tokens | 8191 |
| Cost | ~$0.13 / 1M tokens |
| Distance Metric | Cosine similarity (`<=>` operator in pgvector) |
