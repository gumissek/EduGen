"""Backup service — automated and manual backup/restore."""

from __future__ import annotations

import os
import shutil
import zipfile
from datetime import datetime, timedelta, timezone
from pathlib import Path
from uuid import uuid4

from sqlalchemy.orm import Session as DBSession

from app.config import settings
from app.models.backup import Backup
from app.models.diagnostic_log import DiagnosticLog


BACKUP_RETENTION_DAYS = 7


def create_backup(db: DBSession) -> Backup:
    """Create a backup of the SQLite database."""
    data_dir = Path(settings.DATA_DIR)
    backups_dir = data_dir / "backups"
    backups_dir.mkdir(parents=True, exist_ok=True)

    db_path = data_dir / "edugen.db"
    if not db_path.exists():
        raise FileNotFoundError("Database file not found")

    now = datetime.now(timezone.utc)
    timestamp = now.strftime("%Y%m%d_%H%M%S")
    backup_filename = f"edugen_backup_{timestamp}.zip"
    backup_path = backups_dir / backup_filename

    # Create ZIP with the database
    with zipfile.ZipFile(str(backup_path), "w", zipfile.ZIP_DEFLATED) as zf:
        zf.write(str(db_path), "edugen.db")

    size_bytes = backup_path.stat().st_size
    expires_at = now + timedelta(days=BACKUP_RETENTION_DAYS)

    backup = Backup(
        backup_path=str(backup_path),
        size_bytes=size_bytes,
        expires_at=expires_at.isoformat(),
    )
    db.add(backup)

    # Log
    log = DiagnosticLog(
        level="INFO",
        message=f"Backup created: {backup_filename} ({size_bytes} bytes)",
    )
    db.add(log)
    db.commit()
    db.refresh(backup)

    return backup


def cleanup_old_backups(db: DBSession) -> int:
    """Remove backups older than retention period. Returns count of removed."""
    now = datetime.now(timezone.utc)
    old_backups = db.query(Backup).all()
    removed = 0

    for backup in old_backups:
        expires_at = datetime.fromisoformat(backup.expires_at)
        if expires_at.tzinfo is None:
            expires_at = expires_at.replace(tzinfo=timezone.utc)

        if expires_at < now:
            # Delete file
            try:
                Path(backup.backup_path).unlink(missing_ok=True)
            except Exception:
                pass
            db.delete(backup)
            removed += 1

    if removed:
        db.commit()

    return removed


def restore_backup(db: DBSession, backup_id: str) -> bool:
    """Restore database from a backup."""
    backup = db.query(Backup).filter(Backup.id == backup_id).first()
    if not backup:
        raise ValueError("Backup not found")

    backup_path = Path(backup.backup_path)
    if not backup_path.exists():
        raise FileNotFoundError("Backup file not found on disk")

    data_dir = Path(settings.DATA_DIR)
    db_path = data_dir / "edugen.db"

    # Close current session
    db.close()

    # Extract backup
    with zipfile.ZipFile(str(backup_path), "r") as zf:
        zf.extract("edugen.db", str(data_dir))

    log_msg = f"Database restored from backup: {backup.backup_path}"

    # Re-open session for logging
    from app.database import SessionLocal
    new_db = SessionLocal()
    try:
        log = DiagnosticLog(level="INFO", message=log_msg)
        new_db.add(log)
        new_db.commit()
    finally:
        new_db.close()

    return True


def list_backups(db: DBSession) -> list[Backup]:
    """List all backups ordered by creation date."""
    return db.query(Backup).order_by(Backup.created_at.desc()).all()
