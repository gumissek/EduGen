"""Diagnostic schemas."""

from __future__ import annotations

from typing import Optional, List

from pydantic import BaseModel


class DiagnosticLogResponse(BaseModel):
    id: str
    level: str
    message: str
    metadata_json: Optional[str] = None
    created_at: str

    class Config:
        from_attributes = True


class DiagnosticListResponse(BaseModel):
    logs: List[DiagnosticLogResponse]
    total: int
    page: int
    per_page: int
