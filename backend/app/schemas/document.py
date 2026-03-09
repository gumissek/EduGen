"""Document schemas."""

from __future__ import annotations

from typing import Optional, List

from pydantic import BaseModel, field_validator


class DocumentResponse(BaseModel):
    id: str
    generation_id: str
    filename: str
    file_path: str
    variants_count: int
    created_at: str

    @field_validator('id', 'generation_id', 'filename', 'created_at', mode='before')
    @classmethod
    def must_not_be_empty(cls, v: str) -> str:
        if not v or not str(v).strip():
            raise ValueError('To pole jest wymagane i nie może być puste')
        return v

    @field_validator('variants_count', mode='before')
    @classmethod
    def variants_must_be_positive(cls, v: int) -> int:
        if v is None:
            return 1
        return max(1, int(v))

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

    @field_validator('id', 'generation_id', 'filename', 'created_at', 'updated_at', mode='before')
    @classmethod
    def required_str_not_empty(cls, v: str) -> str:
        if not v or not str(v).strip():
            raise ValueError('To pole jest wymagane i nie może być puste')
        return v

    @field_validator('subject_id', 'education_level', 'content_type', mode='before')
    @classmethod
    def optional_str_default_empty(cls, v):
        return str(v) if v is not None else ''

    @field_validator('subject_name', 'title', 'content', mode='before')
    @classmethod
    def optional_text_default_empty(cls, v):
        return str(v) if v is not None else ''

    @field_validator('class_level', mode='before')
    @classmethod
    def class_level_non_negative(cls, v) -> int:
        try:
            return max(0, int(v))
        except (TypeError, ValueError):
            return 0

    @field_validator('variants_count', mode='before')
    @classmethod
    def variants_must_be_positive(cls, v: int) -> int:
        if v is None:
            return 1
        return max(1, int(v))

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

    @field_validator('id', 'generation_id', 'filename', 'created_at', 'updated_at', mode='before')
    @classmethod
    def required_str_not_empty(cls, v: str) -> str:
        if not v or not str(v).strip():
            raise ValueError('To pole jest wymagane i nie może być puste')
        return v

    @field_validator('subject_id', 'education_level', 'content_type', mode='before')
    @classmethod
    def optional_str_default_empty(cls, v):
        return str(v) if v is not None else ''

    @field_validator('subject_name', 'title', mode='before')
    @classmethod
    def optional_text_default_empty(cls, v):
        return str(v) if v is not None else ''

    @field_validator('class_level', mode='before')
    @classmethod
    def class_level_non_negative(cls, v) -> int:
        try:
            return max(0, int(v))
        except (TypeError, ValueError):
            return 0

    @field_validator('variants_count', mode='before')
    @classmethod
    def variants_must_be_positive(cls, v: int) -> int:
        if v is None:
            return 1
        return max(1, int(v))

    class Config:
        from_attributes = True


class DocumentUpdateRequest(BaseModel):
    content: str

    @field_validator('content', mode='before')
    @classmethod
    def content_not_none(cls, v) -> str:
        return str(v) if v is not None else ''


class DocumentListResponse(BaseModel):
    documents: List[DocumentListItemResponse]
    total: int
    page: int
    per_page: int


class BulkDownloadRequest(BaseModel):
    document_ids: List[str]

    @field_validator('document_ids', mode='before')
    @classmethod
    def ids_not_empty(cls, v) -> list:
        if not v:
            raise ValueError('Lista dokumentów nie może być pusta')
        return v
