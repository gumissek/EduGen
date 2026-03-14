"""Diagnostic service — retrieval of diagnostic logs."""

from __future__ import annotations

from sqlalchemy.orm import Session as DBSession

from app.models.diagnostic_log import DiagnosticLog


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
