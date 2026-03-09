"""Files router — upload, list, delete source files."""

from __future__ import annotations

from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, BackgroundTasks, status
from sqlalchemy.orm import Session as DBSession

from app.database import get_db
from app.dependencies import get_current_user
from app.models.user import User
from app.models.source_file import SourceFile
from app.models.subject import Subject
from app.schemas.file import FileResponse, FileListResponse
from app.services.file_service import validate_file, save_file, process_file_extraction, compute_file_hash

router = APIRouter(prefix="/files", tags=["files"])


def _parse_extraction_error(extracted_text: str | None) -> str | None:
    """Return an error code if extracted_text carries an OCR_ERROR marker."""
    if not extracted_text:
        return None
    if extracted_text.startswith("[OCR_ERROR:"):
        end = extracted_text.find("]")
        return extracted_text[len("[OCR_ERROR:"):end] if end != -1 else "UNKNOWN"
    return None


def _to_response(sf: SourceFile) -> FileResponse:
    error = _parse_extraction_error(sf.extracted_text)
    return FileResponse(
        id=sf.id,
        subject_id=sf.subject_id,
        filename=sf.filename,
        file_type=sf.file_type,
        file_size=sf.file_size,
        summary=sf.summary,
        page_count=sf.page_count,
        created_at=sf.created_at,
        has_extracted_text=bool(sf.extracted_text) and error is None,
        extraction_error=error,
    )


@router.post("", response_model=FileResponse, status_code=status.HTTP_201_CREATED)
async def upload_file(
    background_tasks: BackgroundTasks,
    subject_id: str = Form(...),
    file: UploadFile = File(...),
    db: DBSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Upload a source file (PDF, DOCX, JPG, PNG)."""
    # Validate subject exists
    subject = db.query(Subject).filter(Subject.id == subject_id).first()
    if not subject:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Subject not found")

    # Read file
    file_bytes = await file.read()

    try:
        mime_type, file_type = validate_file(file_bytes, file.filename or "unknown")
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))

    # Determine extension
    ext_map = {"pdf": "pdf", "docx": "docx", "image": "png"}
    if file.filename:
        ext = file.filename.rsplit(".", 1)[-1].lower() if "." in file.filename else ext_map.get(file_type, "bin")
    else:
        ext = ext_map.get(file_type, "bin")

    # Save to disk
    file_uuid, file_path = save_file(file_bytes, subject_id, ext)

    # Compute content hash for deduplication cache
    file_hash = compute_file_hash(file_bytes)

    # Create DB record
    source_file = SourceFile(
        id=file_uuid,
        subject_id=subject_id,
        filename=file.filename or f"{file_uuid}.{ext}",
        original_path=file_path,
        file_type=file_type,
        file_size=len(file_bytes),
        file_hash=file_hash,
    )
    db.add(source_file)
    db.commit()
    db.refresh(source_file)

    # Background text extraction
    background_tasks.add_task(process_file_extraction, db, source_file.id)

    return _to_response(source_file)


@router.get("", response_model=FileListResponse)
def list_files(
    subject_id: str | None = None,
    db: DBSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """List source files, optionally filtered by subject."""
    query = db.query(SourceFile).filter(SourceFile.deleted_at.is_(None))
    if subject_id:
        query = query.filter(SourceFile.subject_id == subject_id)

    files = query.order_by(SourceFile.created_at.desc()).all()
    return FileListResponse(
        files=[_to_response(f) for f in files],
        total=len(files),
    )


@router.delete("/{file_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_file(
    file_id: str,
    db: DBSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Soft-delete a source file."""
    source_file = db.query(SourceFile).filter(SourceFile.id == file_id).first()
    if not source_file:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="File not found")

    source_file.deleted_at = datetime.now(timezone.utc).isoformat()
    db.commit()
