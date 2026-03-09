"""Documents router — finalize, list, download, bulk download."""

from __future__ import annotations

import io
import zipfile
from datetime import datetime, timezone
from pathlib import Path

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import FileResponse as FastAPIFileResponse, StreamingResponse
from sqlalchemy.orm import Session as DBSession

from app.database import get_db
from app.dependencies import get_current_user
from app.models.user import User
from app.models.document import Document
from app.models.generation import Generation
from app.schemas.document import DocumentResponse, DocumentListResponse, BulkDownloadRequest
from app.services.docx_service import generate_docx

router = APIRouter(prefix="/documents", tags=["documents"])


@router.post("/{generation_id}/finalize", response_model=DocumentResponse, status_code=status.HTTP_201_CREATED)
def finalize_document(
    generation_id: str,
    db: DBSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Generate the final DOCX document with variants."""
    generation = db.query(Generation).filter(Generation.id == generation_id).first()
    if not generation:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Generation not found")

    if generation.status not in ("ready", "finalized"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Generation must be in 'ready' status, current: '{generation.status}'",
        )

    try:
        document = generate_docx(db, generation_id)
        return DocumentResponse.model_validate(document)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.get("", response_model=DocumentListResponse)
def list_documents(
    page: int = 1,
    per_page: int = 20,
    subject_id: str | None = None,
    sort_by: str = "created_at",
    db: DBSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """List finalized documents with pagination."""
    query = db.query(Document).filter(Document.deleted_at.is_(None))

    if subject_id:
        query = query.join(Generation).filter(Generation.subject_id == subject_id)

    # Sort
    sort_column = getattr(Document, sort_by, Document.created_at)
    query = query.order_by(sort_column.desc())

    total = query.count()
    documents = query.offset((page - 1) * per_page).limit(per_page).all()

    return DocumentListResponse(
        documents=[DocumentResponse.model_validate(d) for d in documents],
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
    document = db.query(Document).filter(Document.id == document_id).first()
    if not document:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Document not found")

    document.deleted_at = datetime.now(timezone.utc).isoformat()
    db.commit()
