"""Backups router."""

from __future__ import annotations

from datetime import datetime, timedelta, timezone
from pathlib import Path

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, status
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session as DBSession

from app.database import get_db
from app.dependencies import get_current_superuser
from app.models.user import User
from app.schemas.backup import BackupResponse, BackupListResponse
from app.services.backup_service import create_backup, list_backups, restore_backup, validate_backup_archive
from app.models.backup import Backup
from app.config import settings

router = APIRouter(prefix="/backups", tags=["backups"])


@router.post("", response_model=BackupResponse, status_code=status.HTTP_201_CREATED)
def trigger_backup(
    db: DBSession = Depends(get_db),
    current_user: User = Depends(get_current_superuser),
):
    """Manually trigger a backup."""
    try:
        backup = create_backup(db)
        return BackupResponse.model_validate(backup)
    except FileNotFoundError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))


@router.get("", response_model=BackupListResponse)
def get_backups(
    db: DBSession = Depends(get_db),
    current_user: User = Depends(get_current_superuser),
):
    """List all available backups."""
    backups = list_backups(db)
    return BackupListResponse(
        backups=[BackupResponse.model_validate(b) for b in backups],
    )


@router.post("/restore")
def restore_from_backup(
    backup_id: str,
    db: DBSession = Depends(get_db),
    current_user: User = Depends(get_current_superuser),
):
    """Restore database from a specific backup."""
    try:
        restore_backup(db, backup_id)
        return {"detail": "Database restored successfully. Please restart the application."}
    except ValueError as e:
        detail = str(e)
        status_code = status.HTTP_404_NOT_FOUND if "not found" in detail.lower() else status.HTTP_400_BAD_REQUEST
        raise HTTPException(status_code=status_code, detail=detail)
    except FileNotFoundError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))


@router.get("/{backup_id}/download")
def download_backup(
    backup_id: str,
    db: DBSession = Depends(get_db),
    current_user: User = Depends(get_current_superuser),
):
    """Download a backup archive file."""
    backup = db.query(Backup).filter(Backup.id == backup_id).first()
    if not backup:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Backup not found")

    backup_path = Path(backup.backup_path)
    if not backup_path.exists():
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Backup file not found on disk")

    return FileResponse(
        path=str(backup_path),
        filename=backup_path.name,
        media_type="application/zip",
    )


@router.post("/upload", response_model=BackupResponse, status_code=status.HTTP_201_CREATED)
async def upload_backup(
    file: UploadFile = File(...),
    db: DBSession = Depends(get_db),
    current_user: User = Depends(get_current_superuser),
):
    """Upload an external backup archive (.zip with dump.json)."""
    if not file.filename:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Filename is required")

    filename = file.filename.lower()
    if not filename.endswith(".zip"):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Only .zip backups are supported")

    backups_dir = Path(settings.DATA_DIR) / "backups"
    backups_dir.mkdir(parents=True, exist_ok=True)

    timestamp = datetime.now(timezone.utc).strftime("%Y%m%d_%H%M%S")
    safe_name = Path(file.filename).name
    stored_name = f"uploaded_{timestamp}_{safe_name}"
    stored_path = backups_dir / stored_name

    content = await file.read()
    stored_path.write_bytes(content)

    try:
        validate_backup_archive(stored_path)
    except Exception as e:
        stored_path.unlink(missing_ok=True)
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))

    size_bytes = stored_path.stat().st_size
    backup = Backup(
        backup_path=str(stored_path),
        size_bytes=size_bytes,
        expires_at=(datetime.now(timezone.utc) + timedelta(days=7)).isoformat(),
    )
    db.add(backup)
    db.commit()
    db.refresh(backup)

    return BackupResponse.model_validate(backup)
