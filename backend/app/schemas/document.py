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


class DocumentDetailResponse(BaseModel):
    """Enriched document response with content and metadata from related Generation/Prototype."""
    id: str
    generation_id: str
    subject_id: str
    subject_name: str
    title: str
    content_type: str
    education_level: str
    class_level: int
    content: str
    filename: str
    variants_count: int
    created_at: str
    updated_at: str

    class Config:
        from_attributes = True


class DocumentListItemResponse(BaseModel):
    """Lightweight document response for list views (no content body)."""
    id: str
    generation_id: str
    subject_id: str
    subject_name: str
    title: str
    content_type: str
    education_level: str
    class_level: int
    filename: str
    variants_count: int
    created_at: str
    updated_at: str

    class Config:
        from_attributes = True


class DocumentUpdateRequest(BaseModel):
    content: str


class DocumentListResponse(BaseModel):
    documents: List[DocumentListItemResponse]
    total: int
    page: int
    per_page: int


class BulkDownloadRequest(BaseModel):
    document_ids: List[str]
