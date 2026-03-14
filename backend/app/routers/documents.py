"""Documents router — finalize, list, download, bulk download."""

from __future__ import annotations

import io
import shutil
import zipfile
from datetime import datetime, timezone
from pathlib import Path

import fitz  # PyMuPDF

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import FileResponse as FastAPIFileResponse, StreamingResponse
from sqlalchemy.orm import Session as DBSession
from sqlalchemy import insert, select

from app.database import get_db
from app.dependencies import get_current_user
from app.models.user import User
from app.models.document import Document
from app.models.generation import Generation
from app.models.prototype import Prototype
from app.models.subject import Subject
from app.models.generation_source_file import generation_source_files
from app.schemas.document import (
    DocumentResponse,
    DocumentDetailResponse,
    DocumentListItemResponse,
    DocumentUpdateRequest,
    DocumentListResponse,
    BulkDownloadRequest,
    MoveToDraftResponse,
)
from app.services.docx_service import generate_docx

router = APIRouter(prefix="/documents", tags=["documents"])


def _append_copy_suffix(value: str) -> str:
    text = (value or "").strip()
    if not text:
        return "copy"
    return f"{text} copy"


def _build_detail(document: Document, db: DBSession) -> DocumentDetailResponse:
    """Build a DocumentDetailResponse by joining Generation and Prototype data."""
    generation = db.query(Generation).filter(Generation.id == document.generation_id).first()
    prototype = db.query(Prototype).filter(Prototype.generation_id == document.generation_id).first()
    subject = db.query(Subject).filter(Subject.id == generation.subject_id).first() if generation else None

    content = ""
    comments_json = None
    updated_at = document.created_at
    if prototype:
        content = prototype.edited_content or prototype.original_content or ""
        comments_json = prototype.comments_json
        updated_at = prototype.updated_at

    return DocumentDetailResponse(
        id=document.id,
        generation_id=document.generation_id,
        subject_id=(generation.subject_id or "") if generation else "",
        subject_name=(subject.name or "") if subject else "",
        title=(generation.topic or document.filename) if generation else document.filename,
        content_type=(generation.content_type or "") if generation else "",
        education_level=(generation.education_level or "") if generation else "",
        class_level=str(generation.class_level).strip() if generation and generation.class_level else "",
        content=content,
        comments_json=comments_json,
        filename=document.filename,
        variants_count=document.variants_count,
        created_at=document.created_at,
        updated_at=updated_at,
    )


def _build_list_item(document: Document, db: DBSession) -> DocumentListItemResponse:
    """Build a DocumentListItemResponse (no content body) by joining Generation data."""
    generation = db.query(Generation).filter(Generation.id == document.generation_id).first()
    prototype = db.query(Prototype).filter(Prototype.generation_id == document.generation_id).first()
    subject = db.query(Subject).filter(Subject.id == generation.subject_id).first() if generation else None
    updated_at = prototype.updated_at if prototype else document.created_at

    return DocumentListItemResponse(
        id=document.id,
        generation_id=document.generation_id,
        subject_id=(generation.subject_id or "") if generation else "",
        subject_name=(subject.name or "") if subject else "",
        title=(generation.topic or document.filename) if generation else document.filename,
        content_type=(generation.content_type or "") if generation else "",
        education_level=(generation.education_level or "") if generation else "",
        class_level=str(generation.class_level).strip() if generation and generation.class_level else "",
        filename=document.filename,
        variants_count=document.variants_count,
        created_at=document.created_at,
        updated_at=updated_at,
    )

@router.post("/{generation_id}/finalize", response_model=DocumentResponse, status_code=status.HTTP_201_CREATED)
def finalize_document(
    generation_id: str,
    db: DBSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Generate the final DOCX document with variants."""
    generation = db.query(Generation).filter(
        Generation.id == generation_id,
        Generation.user_id == current_user.id,
    ).first()
    if not generation:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Generation not found")

    if generation.status not in ("ready", "finalized"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Generation must be in 'ready' status, current: '{generation.status}'",
        )

    try:
        document = generate_docx(db, generation_id, user_id=current_user.id)
        return DocumentResponse.model_validate(document)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.get("/{document_id}", response_model=DocumentDetailResponse)
def get_document(
    document_id: str,
    db: DBSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get a single document with its content and metadata."""
    document = db.query(Document).filter(
        Document.id == document_id,
        Document.user_id == current_user.id,
        Document.deleted_at.is_(None),
    ).first()
    if not document:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Document not found")
    return _build_detail(document, db)


@router.put("/{document_id}", response_model=DocumentDetailResponse)
def update_document(
    document_id: str,
    body: DocumentUpdateRequest,
    db: DBSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Update the edited content of a document (stored in its Prototype)."""
    document = db.query(Document).filter(
        Document.id == document_id,
        Document.user_id == current_user.id,
        Document.deleted_at.is_(None),
    ).first()
    if not document:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Document not found")

    prototype = db.query(Prototype).filter(Prototype.generation_id == document.generation_id).first()
    if prototype:
        prototype.edited_content = body.content
        if body.comments_json is not None:
            prototype.comments_json = body.comments_json
        prototype.updated_at = datetime.now(timezone.utc).isoformat()
        db.commit()

    return _build_detail(document, db)


@router.get("/{document_id}/export/docx")
def export_docx(
    document_id: str,
    db: DBSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Download the DOCX file for a document."""
    document = db.query(Document).filter(
        Document.id == document_id,
        Document.user_id == current_user.id,
        Document.deleted_at.is_(None),
    ).first()
    if not document:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Document not found")

    file_path = Path(document.file_path)
    if not file_path.exists():
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="File not found on disk")

    return FastAPIFileResponse(
        path=str(file_path),
        filename=document.filename,
        media_type="application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    )


@router.get("/{document_id}/export/pdf")
def export_pdf(
    document_id: str,
    db: DBSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Convert and download the document as a PDF (converted from DOCX via PyMuPDF)."""
    document = db.query(Document).filter(
        Document.id == document_id,
        Document.user_id == current_user.id,
        Document.deleted_at.is_(None),
    ).first()
    if not document:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Document not found")

    file_path = Path(document.file_path)
    if not file_path.exists():
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="File not found on disk")

    try:
        doc = fitz.open(str(file_path))
        pdf_bytes = doc.convert_to_pdf()
        doc.close()
    except Exception as exc:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"PDF conversion failed: {exc}")

    pdf_filename = document.filename.rsplit(".", 1)[0] + ".pdf"
    return StreamingResponse(
        io.BytesIO(pdf_bytes),
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="{pdf_filename}"'},
    )


@router.get("", response_model=DocumentListResponse)
def list_documents(
    page: int = 1,
    per_page: int = 20,
    subject_id: str | None = None,
    content_type: str | None = None,
    class_level: str | None = None,
    sort_by: str = "created_at",
    db: DBSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """List finalized documents with pagination."""
    query = db.query(Document).filter(
        Document.user_id == current_user.id,
        Document.deleted_at.is_(None),
    )

    if subject_id or content_type or class_level is not None:
        query = query.join(Generation)
        if subject_id:
            query = query.filter(Generation.subject_id == subject_id)
        if content_type:
            query = query.filter(Generation.content_type == content_type)
        if class_level is not None:
            query = query.filter(Generation.class_level == class_level)

    # Sort
    sort_column = getattr(Document, sort_by, Document.created_at)
    query = query.order_by(sort_column.desc())

    total = query.count()
    documents = query.offset((page - 1) * per_page).limit(per_page).all()

    return DocumentListResponse(
        documents=[_build_list_item(d, db) for d in documents],
        total=total,
        page=page,
        per_page=per_page,
    )


@router.get("/{document_id}/download")
def download_document(
    document_id: str,
    db: DBSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Download a single DOCX document."""
    document = db.query(Document).filter(
        Document.id == document_id,
        Document.user_id == current_user.id,
        Document.deleted_at.is_(None),
    ).first()
    if not document:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Document not found")

    file_path = Path(document.file_path)
    if not file_path.exists():
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="File not found on disk")

    return FastAPIFileResponse(
        path=str(file_path),
        filename=document.filename,
        media_type="application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    )


@router.post("/bulk-download")
def bulk_download(
    body: BulkDownloadRequest,
    db: DBSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Download multiple documents as a ZIP file."""
    documents = (
        db.query(Document)
        .filter(
            Document.id.in_(body.document_ids),
            Document.user_id == current_user.id,
            Document.deleted_at.is_(None),
        )
        .all()
    )

    if not documents:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="No documents found")

    # Create ZIP in memory using streaming
    buffer = io.BytesIO()
    with zipfile.ZipFile(buffer, "w", zipfile.ZIP_DEFLATED) as zf:
        for doc in documents:
            file_path = Path(doc.file_path)
            if file_path.exists():
                zf.write(str(file_path), doc.filename)

    buffer.seek(0)

    return StreamingResponse(
        buffer,
        media_type="application/zip",
        headers={
            "Content-Disposition": f'attachment; filename="edugen_documents_{datetime.now().strftime("%Y%m%d")}.zip"'
        },
    )


@router.delete("/{document_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_document(
    document_id: str,
    db: DBSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Soft-delete a document."""
    document = db.query(Document).filter(
        Document.id == document_id,
        Document.user_id == current_user.id,
    ).first()
    if not document:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Document not found")

    document.deleted_at = datetime.now(timezone.utc).isoformat()
    db.commit()


@router.post("/{document_id}/move-to-draft", response_model=MoveToDraftResponse)
def move_document_to_draft(
    document_id: str,
    db: DBSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Move a finalized document back to editable draft mode."""
    document = db.query(Document).filter(
        Document.id == document_id,
        Document.user_id == current_user.id,
        Document.deleted_at.is_(None),
    ).first()
    if not document:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Document not found")

    generation = db.query(Generation).filter(
        Generation.id == document.generation_id,
        Generation.user_id == current_user.id,
    ).first()
    if not generation:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Generation not found")

    prototype = db.query(Prototype).filter(Prototype.generation_id == generation.id).first()
    if not prototype:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Prototype not found")

    now_iso = datetime.now(timezone.utc).isoformat()
    document.deleted_at = now_iso
    generation.status = "ready"
    generation.updated_at = now_iso
    prototype.updated_at = now_iso
    db.commit()

    return MoveToDraftResponse(
        generation_id=generation.id,
        message="Document moved to draft mode",
    )


@router.post("/{document_id}/copy", response_model=DocumentDetailResponse, status_code=status.HTTP_201_CREATED)
def copy_document(
    document_id: str,
    db: DBSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Create a deep copy of a finalized document (+generation/prototype/source links)."""
    document = db.query(Document).filter(
        Document.id == document_id,
        Document.user_id == current_user.id,
        Document.deleted_at.is_(None),
    ).first()
    if not document:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Document not found")

    generation = db.query(Generation).filter(
        Generation.id == document.generation_id,
        Generation.user_id == current_user.id,
    ).first()
    if not generation:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Generation not found")

    prototype = db.query(Prototype).filter(Prototype.generation_id == generation.id).first()
    if not prototype:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Prototype not found")

    now_iso = datetime.now(timezone.utc).isoformat()

    copied_generation = Generation(
        user_id=generation.user_id,
        subject_id=generation.subject_id,
        content_type=generation.content_type,
        education_level=generation.education_level,
        class_level=generation.class_level,
        language_level=generation.language_level,
        topic=_append_copy_suffix(generation.topic),
        instructions=generation.instructions,
        difficulty=generation.difficulty,
        total_questions=generation.total_questions,
        open_questions=generation.open_questions,
        closed_questions=generation.closed_questions,
        variants_count=generation.variants_count,
        task_types=generation.task_types,
        created_at=now_iso,
        updated_at=now_iso,
        status=generation.status,
        error_message=None,
    )
    db.add(copied_generation)
    db.flush()

    source_rows = db.execute(
        select(generation_source_files.c.source_file_id).where(
            generation_source_files.c.generation_id == generation.id
        )
    ).all()
    if source_rows:
        db.execute(
            insert(generation_source_files),
            [
                {
                    "generation_id": copied_generation.id,
                    "source_file_id": row.source_file_id,
                }
                for row in source_rows
            ],
        )

    copied_prototype = Prototype(
        user_id=prototype.user_id,
        generation_id=copied_generation.id,
        original_content=prototype.original_content,
        edited_content=prototype.edited_content,
        answer_key=prototype.answer_key,
        raw_questions_json=prototype.raw_questions_json,
        comments_json=prototype.comments_json,
        created_at=now_iso,
        updated_at=now_iso,
    )
    db.add(copied_prototype)

    src_path = Path(document.file_path)
    if not src_path.exists():
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="File not found on disk")

    copied_filename = _append_copy_suffix(document.filename)
    if "." in document.filename:
        stem, ext = document.filename.rsplit(".", 1)
        copied_filename = f"{_append_copy_suffix(stem)}.{ext}"

    copied_file_path = src_path.with_name(f"{src_path.stem}_copy_{int(datetime.now().timestamp())}{src_path.suffix}")
    shutil.copy2(src_path, copied_file_path)

    copied_document = Document(
        user_id=document.user_id,
        generation_id=copied_generation.id,
        filename=copied_filename,
        file_path=str(copied_file_path),
        variants_count=document.variants_count,
        created_at=now_iso,
        deleted_at=None,
    )
    db.add(copied_document)
    db.commit()
    db.refresh(copied_document)

    return _build_detail(copied_document, db)
