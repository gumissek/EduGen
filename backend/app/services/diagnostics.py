import json

from sqlalchemy.orm import Session

from app.core.security import generate_uuid
from app.db.models import DiagnosticLog


def log_event(db: Session, level: str, message: str, metadata: dict | None = None) -> None:
    db.add(
        DiagnosticLog(
            id=generate_uuid(),
            level=level,
            message=message,
            metadata_json=json.dumps(metadata or {}, ensure_ascii=False),
        )
    )
    db.commit()
