"""Document schemas."""

from __future__ import annotations

from typing import Optional, List

from pydantic import BaseModel


class DocumentResponse(BaseModel):
    id: str
    generation_id: str
    filename: str
    file_path: str
    variants_count: int
    created_at: str

    class Config:
        from_attributes = True


class DocumentListResponse(BaseModel):
    documents: List[DocumentResponse]
    total: int
    page: int
    per_page: int


class BulkDownloadRequest(BaseModel):
    document_ids: List[str]
