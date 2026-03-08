from __future__ import annotations

import shutil
from datetime import timedelta
from pathlib import Path

from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.security import generate_uuid, now_utc
from app.db.models import Backup


def create_backup(db: Session) -> Backup:
    db_file = Path(settings.database_url.replace("sqlite:///", ""))
    backup_dir = Path(settings.data_dir) / "backups"
    backup_dir.mkdir(parents=True, exist_ok=True)

    backup_id = generate_uuid()
    backup_path = backup_dir / f"backup_{backup_id}.sqlite"
    shutil.copy2(db_file, backup_path)

    zip_path = backup_dir / f"backup_{backup_id}.zip"
    shutil.make_archive(str(zip_path.with_suffix("")), "zip", backup_dir, backup_path.name)
    backup_path.unlink(missing_ok=True)

    backup = Backup(
        id=backup_id,
        backup_path=str(zip_path),
        size_bytes=zip_path.stat().st_size,
        expires_at=now_utc() + timedelta(days=7),
    )
    db.add(backup)
    db.commit()
    db.refresh(backup)

    rows = db.query(Backup).order_by(Backup.created_at.desc()).all()
    for stale in rows[7:]:
        Path(stale.backup_path).unlink(missing_ok=True)
        db.delete(stale)
    db.commit()

    return backup
