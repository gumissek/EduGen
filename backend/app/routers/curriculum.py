"""Curriculum router — CRUD and search endpoints for curriculum documents."""

from __future__ import annotations

import hashlib
import json
import logging
from datetime import datetime, timezone
from pathlib import Path
from uuid import uuid4

from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks, UploadFile, File, Form, status
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session as DBSession

from app.config import settings
from app.database import get_db
from app.dependencies import get_current_user, get_current_superuser
from app.encryption import decrypt_api_key
from app.models.curriculum_document import CurriculumDocument
from app.models.curriculum_chunk import CurriculumChunk
from app.models.generation import Generation
from app.models.prototype import Prototype
from app.models.secret_key import SecretKey
from app.models.user import User
from app.schemas.curriculum import (
    CurriculumDocumentResponse,
    CurriculumDocumentListResponse,
    CurriculumSearchRequest,
    CurriculumSearchResponse,
    CurriculumStatusResponse,
    ComplianceResponse,
)
from app.services.curriculum_service import (
    process_curriculum_document,
    search_similar_chunks,
    generate_embedding,
    check_compliance,
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/curriculum", tags=["curriculum"])

ALLOWED_MIME_TYPES = {"application/pdf"}
MAX_PDF_SIZE_MB = 50


def _get_curriculum_dir() -> Path:
    return Path(settings.DATA_DIR) / "curriculum"


def _get_api_key(db: DBSession, user_id: str) -> str:
    """Get decrypted API key for the given user."""
    secret_key = (
        db.query(SecretKey)
        .filter(SecretKey.user_id == user_id, SecretKey.is_active == True)
        .first()
    )
    if not secret_key:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Brak klucza API. Dodaj klucz w Ustawieniach.",
        )
    return decrypt_api_key(secret_key.secret_key_hash)


# === Public Endpoints ===


@router.get("/documents", response_model=CurriculumDocumentListResponse)
def list_curriculum_documents(
    education_level: str | None = None,
    subject_name: str | None = None,
    db: DBSession = Depends(get_db),
):
    """List all curriculum documents with status='ready' (public)."""
    query = db.query(CurriculumDocument).filter(
        CurriculumDocument.status == "ready",
        CurriculumDocument.is_active == True,
    )

    if education_level:
        query = query.filter(CurriculumDocument.education_level == education_level)
    if subject_name:
        query = query.filter(CurriculumDocument.subject_name == subject_name)

    documents = query.order_by(CurriculumDocument.created_at.desc()).all()

    return CurriculumDocumentListResponse(
        documents=[CurriculumDocumentResponse.model_validate(d) for d in documents],
        total=len(documents),
    )


@router.get("/documents/admin", response_model=CurriculumDocumentListResponse)
def list_curriculum_documents_admin(
    education_level: str | None = None,
    subject_name: str | None = None,
    status_filter: str | None = None,
    db: DBSession = Depends(get_db),
    current_user: User = Depends(get_current_superuser),
):
    """List curriculum documents for admin (active documents only)."""
    del current_user  # dependency enforces superuser access

    query = db.query(CurriculumDocument).filter(CurriculumDocument.is_active == True)

    if education_level:
        query = query.filter(CurriculumDocument.education_level == education_level)
    if subject_name:
        query = query.filter(CurriculumDocument.subject_name == subject_name)
    if status_filter:
        query = query.filter(CurriculumDocument.status == status_filter)

    documents = query.order_by(CurriculumDocument.created_at.desc()).all()

    return CurriculumDocumentListResponse(
        documents=[CurriculumDocumentResponse.model_validate(d) for d in documents],
        total=len(documents),
    )


@router.get("/documents/{document_id}", response_model=CurriculumDocumentResponse)
def get_curriculum_document(
    document_id: str,
    db: DBSession = Depends(get_db),
):
    """Get single curriculum document details (public)."""
    document = (
        db.query(CurriculumDocument)
        .filter(CurriculumDocument.id == document_id, CurriculumDocument.is_active == True)
        .first()
    )
    if not document:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Dokument nie znaleziony")
    return CurriculumDocumentResponse.model_validate(document)


@router.get("/documents/{document_id}/download")
def download_curriculum_document(
    document_id: str,
    db: DBSession = Depends(get_db),
):
    """Download original PDF file (public)."""
    document = (
        db.query(CurriculumDocument)
        .filter(CurriculumDocument.id == document_id, CurriculumDocument.is_active == True)
        .first()
    )
    if not document:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Dokument nie znaleziony")

    file_path = Path(document.file_path)
    if not file_path.exists():
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Plik nie znaleziony na dysku")

    return FileResponse(
        path=str(file_path),
        media_type="application/pdf",
        filename=document.original_filename,
    )


# === Admin Endpoints ===


@router.post("/documents", response_model=CurriculumDocumentResponse, status_code=status.HTTP_201_CREATED)
async def upload_curriculum_document(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    education_level: str | None = Form(None),
    subject_name: str | None = Form(None),
    description: str | None = Form(None),
    db: DBSession = Depends(get_db),
    current_user: User = Depends(get_current_superuser),
):
    """Upload a new curriculum PDF (admin only)."""
    # Validate file type
    if file.content_type not in ALLOWED_MIME_TYPES:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Dozwolone są tylko pliki PDF.",
        )

    # Read file content
    file_bytes = await file.read()

    # Validate file size
    max_size = MAX_PDF_SIZE_MB * 1024 * 1024
    if len(file_bytes) > max_size:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Plik jest zbyt duży. Maksymalny rozmiar: {MAX_PDF_SIZE_MB} MB.",
        )

    # Check for duplicate by file hash
    file_hash = hashlib.sha256(file_bytes).hexdigest()
    original_filename = file.filename or "document.pdf"
    safe_filename = "original.pdf"
    now = datetime.now(timezone.utc).isoformat()

    existing = db.query(CurriculumDocument).filter(CurriculumDocument.file_hash == file_hash).first()

    if existing and existing.is_active:
        # Active record — reject as duplicate
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Ten plik został już wgrany wcześniej.",
        )

    if existing and not existing.is_active:
        # Soft-deleted record with same hash — reactivate and reuse embeddings
        logger.info(
            "[curriculum] Re-upload of soft-deleted document: document_id=%s file_hash=%.12s",
            existing.id,
            file_hash,
        )
        doc_dir = _get_curriculum_dir() / existing.id
        doc_dir.mkdir(parents=True, exist_ok=True)
        file_path = doc_dir / safe_filename
        file_path.write_bytes(file_bytes)

        existing.filename = safe_filename
        existing.original_filename = original_filename
        existing.file_path = str(file_path)
        existing.file_size = len(file_bytes)
        existing.education_level = education_level
        existing.subject_name = subject_name
        existing.description = description
        existing.uploaded_by = current_user.id
        existing.is_active = True
        existing.updated_at = now

        # If chunks + embeddings already exist, skip full reprocessing
        if existing.chunk_count > 0 and existing.status == "ready":
            logger.info(
                "[curriculum] Reactivated document with existing embeddings — skipping pipeline: "
                "document_id=%s chunks=%d",
                existing.id,
                existing.chunk_count,
            )
        else:
            # Chunks were lost or document was never fully processed — reprocess
            logger.info(
                "[curriculum] Reactivated document needs reprocessing: document_id=%s status=%s chunks=%d",
                existing.id,
                existing.status,
                existing.chunk_count,
            )
            existing.status = "uploaded"
            existing.chunk_count = 0
            existing.error_message = None
            api_key = _get_api_key(db, current_user.id)
            db.commit()
            db.refresh(existing)
            background_tasks.add_task(process_curriculum_document, db, existing.id, api_key)
            return CurriculumDocumentResponse.model_validate(existing)

        db.commit()
        db.refresh(existing)
        return CurriculumDocumentResponse.model_validate(existing)

    # Brand-new document — save file and kick off full pipeline
    doc_id = str(uuid4())
    doc_dir = _get_curriculum_dir() / doc_id
    doc_dir.mkdir(parents=True, exist_ok=True)

    file_path = doc_dir / safe_filename
    file_path.write_bytes(file_bytes)

    document = CurriculumDocument(
        id=doc_id,
        filename=safe_filename,
        original_filename=original_filename,
        file_path=str(file_path),
        file_size=len(file_bytes),
        file_hash=file_hash,
        education_level=education_level,
        subject_name=subject_name,
        description=description,
        status="uploaded",
        is_active=True,
        uploaded_by=current_user.id,
        created_at=now,
        updated_at=now,
    )
    db.add(document)
    db.commit()
    db.refresh(document)

    api_key = _get_api_key(db, current_user.id)
    background_tasks.add_task(process_curriculum_document, db, doc_id, api_key)

    return CurriculumDocumentResponse.model_validate(document)


@router.delete("/documents/{document_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_curriculum_document(
    document_id: str,
    db: DBSession = Depends(get_db),
    current_user: User = Depends(get_current_superuser),
):
    """Soft-delete a curriculum document (admin only).

    The physical PDF file is removed from disk, but the DB record and all
    associated chunks (including embeddings) are retained with is_active=False.
    This allows embedding reuse if the same document is re-uploaded later.
    """
    document = (
        db.query(CurriculumDocument)
        .filter(CurriculumDocument.id == document_id, CurriculumDocument.is_active == True)
        .first()
    )
    if not document:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Dokument nie znaleziony")

    logger.info(
        "[curriculum] Soft-deleting document: document_id=%s original_filename=%s",
        document_id,
        document.original_filename,
    )

    # Remove physical files from disk (keep DB record + chunks for embedding reuse)
    import shutil
    doc_dir = Path(document.file_path).parent
    if doc_dir.exists():
        shutil.rmtree(str(doc_dir), ignore_errors=True)
        logger.info("[curriculum] Removed document directory from disk: path=%s", doc_dir)
    else:
        logger.warning("[curriculum] Document directory not found on disk: path=%s", doc_dir)

    document.is_active = False
    document.updated_at = datetime.now(timezone.utc).isoformat()
    db.commit()
    logger.info(
        "[curriculum] Soft-delete complete: document_id=%s chunks_preserved=%d",
        document_id,
        document.chunk_count,
    )


@router.get("/documents/{document_id}/status", response_model=CurriculumStatusResponse)
def get_document_status(
    document_id: str,
    db: DBSession = Depends(get_db),
    current_user: User = Depends(get_current_superuser),
):
    """Poll processing status (admin only)."""
    document = (
        db.query(CurriculumDocument)
        .filter(CurriculumDocument.id == document_id, CurriculumDocument.is_active == True)
        .first()
    )
    if not document:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Dokument nie znaleziony")

    return CurriculumStatusResponse(
        status=document.status,
        chunk_count=document.chunk_count,
        error_message=document.error_message,
    )


@router.post("/documents/{document_id}/reprocess", response_model=CurriculumDocumentResponse)
def reprocess_curriculum_document(
    document_id: str,
    background_tasks: BackgroundTasks,
    db: DBSession = Depends(get_db),
    current_user: User = Depends(get_current_superuser),
):
    """Re-run processing pipeline (admin only)."""
    document = (
        db.query(CurriculumDocument)
        .filter(CurriculumDocument.id == document_id, CurriculumDocument.is_active == True)
        .first()
    )
    if not document:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Dokument nie znaleziony")

    # Delete existing chunks
    db.query(CurriculumChunk).filter(CurriculumChunk.document_id == document_id).delete()
    document.status = "uploaded"
    document.chunk_count = 0
    document.error_message = None
    document.updated_at = datetime.now(timezone.utc).isoformat()
    db.commit()
    db.refresh(document)

    api_key = _get_api_key(db, current_user.id)
    background_tasks.add_task(process_curriculum_document, db, document_id, api_key)

    return CurriculumDocumentResponse.model_validate(document)


# === Authenticated Endpoints ===


@router.post("/search", response_model=CurriculumSearchResponse)
def search_curriculum(
    body: CurriculumSearchRequest,
    db: DBSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Vector similarity search against curriculum (authenticated)."""
    api_key = _get_api_key(db, current_user.id)
    query_embedding = generate_embedding(body.query, api_key)

    results = search_similar_chunks(
        db,
        query_embedding,
        top_k=body.top_k,
        education_level=body.education_level,
        subject_name=body.subject_name,
    )

    return CurriculumSearchResponse(results=results, query=body.query)


@router.post("/compliance/{generation_id}", response_model=ComplianceResponse)
def run_compliance_check(
    generation_id: str,
    db: DBSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Run compliance check on a generation's questions (authenticated)."""
    generation = db.query(Generation).filter(
        Generation.id == generation_id,
        Generation.user_id == current_user.id,
    ).first()
    if not generation:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Generacja nie znaleziona")

    prototype = db.query(Prototype).filter(Prototype.generation_id == generation_id).first()
    if not prototype:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Prototyp nie znaleziony")

    # Parse questions from raw_questions_json
    if not prototype.raw_questions_json:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Brak danych pytań do weryfikacji (typ materiału bez pytań).",
        )

    try:
        data = json.loads(prototype.raw_questions_json)
        questions = data.get("questions", [])
    except (json.JSONDecodeError, TypeError):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Nieprawidłowy format danych pytań.",
        )

    if not questions:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Brak pytań do weryfikacji.",
        )

    api_key = _get_api_key(db, current_user.id)

    compliance_result = check_compliance(
        db,
        questions,
        api_key,
        education_level=generation.education_level,
    )

    # Store compliance_json in prototype
    prototype.compliance_json = json.dumps(compliance_result, ensure_ascii=False)
    prototype.updated_at = datetime.now(timezone.utc).isoformat()
    db.commit()

    return ComplianceResponse(**compliance_result)
