"""Backup service — automated and manual backup/restore."""

from __future__ import annotations

import json
import logging
import zipfile
from datetime import datetime, timedelta, timezone
from pathlib import Path
from uuid import uuid4

from sqlalchemy import delete, insert, select
from sqlalchemy.orm import Session as DBSession

from app.config import settings
from app.database import Base
from app.models.backup import Backup
from app.models.diagnostic_log import DiagnosticLog

logger = logging.getLogger(__name__)

BACKUP_RETENTION_DAYS = 7


def _to_jsonable(value):
    if value is None or isinstance(value, (str, int, float, bool)):
        return value
    return str(value)


def _build_backup_payload(db: DBSession) -> dict:
    payload: dict = {
        "created_at": datetime.now(timezone.utc).isoformat(),
        "tables": [],
    }

    for table in Base.metadata.sorted_tables:
        rows = db.execute(select(table)).mappings().all()
        payload["tables"].append(
            {
                "name": table.name,
                "rows": [
                    {col: _to_jsonable(val) for col, val in row.items()}
                    for row in rows
                ],
            }
        )

    return payload


def _ensure_valid_backup_archive(backup_path: Path) -> None:
    if not backup_path.exists():
        raise FileNotFoundError("Backup file not found on disk")

    with zipfile.ZipFile(str(backup_path), "r") as zf:
        names = set(zf.namelist())
        if "dump.json" not in names:
            raise ValueError("Backup archive is invalid: missing dump.json")


def _restore_from_payload(db: DBSession, payload: dict) -> None:
    tables_payload = payload.get("tables")
    if not isinstance(tables_payload, list):
        raise ValueError("Invalid backup payload")

    table_by_name = {table.name: table for table in Base.metadata.sorted_tables}

    for table in reversed(Base.metadata.sorted_tables):
        db.execute(delete(table))

    for table_dump in tables_payload:
        table_name = table_dump.get("name")
        rows = table_dump.get("rows") or []
        table = table_by_name.get(table_name)
        if table is None:
            continue
        if rows:
            db.execute(insert(table), rows)

    db.commit()


def validate_backup_archive(backup_path: Path) -> None:
    """Validate backup archive format (zip with dump.json)."""
    _ensure_valid_backup_archive(backup_path)


def create_backup(db: DBSession) -> Backup:
    """Create a full logical dump backup of the database."""
    data_dir = Path(settings.DATA_DIR)
    backups_dir = data_dir / "backups"
    backups_dir.mkdir(parents=True, exist_ok=True)

    now = datetime.now(timezone.utc)
    timestamp = now.strftime("%Y%m%d_%H%M%S")
    backup_filename = f"edugen_backup_{timestamp}.zip"
    backup_path = backups_dir / backup_filename

    payload = _build_backup_payload(db)

    # Create ZIP with logical dump
    with zipfile.ZipFile(str(backup_path), "w", zipfile.ZIP_DEFLATED) as zf:
        zf.writestr("dump.json", json.dumps(payload, ensure_ascii=False))

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
    """Restore database from a backup archive (logical dump)."""
    backup = db.query(Backup).filter(Backup.id == backup_id).first()
    if not backup:
        raise ValueError("Backup not found")

    backup_path = Path(backup.backup_path)
    _ensure_valid_backup_archive(backup_path)

    with zipfile.ZipFile(str(backup_path), "r") as zf:
        payload = json.loads(zf.read("dump.json").decode("utf-8"))

    _restore_from_payload(db, payload)

    log_msg = f"Database restored from backup: {backup.backup_path}"

    log = DiagnosticLog(level="INFO", message=log_msg)
    db.add(log)
    db.commit()

    return True


def list_backups(db: DBSession) -> list[Backup]:
    """List all backups ordered by creation date."""
    return db.query(Backup).order_by(Backup.created_at.desc()).all()
