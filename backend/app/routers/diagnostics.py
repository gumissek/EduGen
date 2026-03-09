"""Diagnostics router."""

from __future__ import annotations

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session as DBSession

from app.database import get_db
from app.dependencies import get_current_user
from app.models.user import User
from app.schemas.diagnostic import DiagnosticListResponse, DiagnosticLogResponse
from app.services.diagnostic_service import get_logs

router = APIRouter(prefix="/diagnostics", tags=["diagnostics"])


@router.get("/logs", response_model=DiagnosticListResponse)
def list_diagnostic_logs(
    level: str | None = None,
    page: int = 1,
    per_page: int = 50,
    db: DBSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get paginated diagnostic logs, optionally filtered by level."""
    logs, total = get_logs(db, level=level, page=page, per_page=per_page)

    return DiagnosticListResponse(
        logs=[DiagnosticLogResponse.model_validate(log) for log in logs],
        total=total,
        page=page,
        per_page=per_page,
    )
