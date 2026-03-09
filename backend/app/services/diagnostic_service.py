"""Diagnostic service — logging and retrieval."""

from __future__ import annotations

import json
import traceback
from datetime import datetime, timezone

from sqlalchemy.orm import Session as DBSession

from app.models.diagnostic_log import DiagnosticLog


def log_event(
    db: DBSession,
    level: str,
    message: str,
    metadata: dict | None = None,
) -> DiagnosticLog:
    """Log a diagnostic event."""
    log = DiagnosticLog(
        level=level.upper(),
        message=message,
        metadata_json=json.dumps(metadata, ensure_ascii=False) if metadata else None,
    )
    db.add(log)
    db.commit()
    db.refresh(log)
    return log


def log_exception(db: DBSession, exc: Exception, context: str = "") -> DiagnosticLog:
    """Log an exception with full traceback."""
    return log_event(
        db,
        level="ERROR",
        message=f"{context}: {str(exc)}" if context else str(exc),
        metadata={"traceback": traceback.format_exc()},
    )


def get_logs(
    db: DBSession,
    level: str | None = None,
    page: int = 1,
    per_page: int = 50,
) -> tuple[list[DiagnosticLog], int]:
    """Get paginated diagnostic logs."""
    query = db.query(DiagnosticLog)

    if level:
        query = query.filter(DiagnosticLog.level == level.upper())

    total = query.count()
    logs = (
        query
        .order_by(DiagnosticLog.created_at.desc())
        .offset((page - 1) * per_page)
        .limit(per_page)
        .all()
    )

    return logs, total
