"""Diagnostics router."""

from __future__ import annotations

import io
import json
from datetime import datetime

from fastapi import APIRouter, Depends
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session as DBSession

from app.database import get_db
from app.dependencies import get_current_superuser
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
    current_user: User = Depends(get_current_superuser),
):
    """Get paginated diagnostic logs, optionally filtered by level."""
    logs, total = get_logs(db, level=level, page=page, per_page=per_page)

    return DiagnosticListResponse(
        logs=[DiagnosticLogResponse.model_validate(log) for log in logs],
        total=total,
        page=page,
        per_page=per_page,
    )


@router.get("/export")
def export_diagnostic_logs(
    level: str | None = None,
    db: DBSession = Depends(get_db),
    current_user: User = Depends(get_current_superuser),
):
    """Export diagnostic logs as a downloadable JSONL file."""
    logs, _ = get_logs(db, level=level, page=1, per_page=100000)

    buffer = io.StringIO()
    for log in logs:
        buffer.write(
            json.dumps(
                {
                    "id": log.id,
                    "level": log.level,
                    "message": log.message,
                    "metadata_json": log.metadata_json,
                    "created_at": log.created_at,
                },
                ensure_ascii=False,
            )
        )
        buffer.write("\n")

    content = buffer.getvalue().encode("utf-8")
    stamp = datetime.utcnow().strftime("%Y%m%d_%H%M%S")
    level_suffix = f"_{level.lower()}" if level else ""
    filename = f"diagnostic_logs{level_suffix}_{stamp}.jsonl"

    return StreamingResponse(
        io.BytesIO(content),
        media_type="application/json",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )
