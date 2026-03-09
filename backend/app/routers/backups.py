"""Backups router."""

from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session as DBSession

from app.database import get_db
from app.dependencies import get_current_user
from app.models.user import User
from app.schemas.backup import BackupResponse, BackupListResponse
from app.services.backup_service import create_backup, list_backups, restore_backup

router = APIRouter(prefix="/backups", tags=["backups"])


@router.post("", response_model=BackupResponse, status_code=status.HTTP_201_CREATED)
def trigger_backup(
    db: DBSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
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
    current_user: User = Depends(get_current_user),
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
    current_user: User = Depends(get_current_user),
):
    """Restore database from a specific backup."""
    try:
        restore_backup(db, backup_id)
        return {"detail": "Database restored successfully. Please restart the application."}
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))
    except FileNotFoundError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))
