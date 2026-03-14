"""Curriculum schemas — request/response validation."""

from __future__ import annotations

from pydantic import BaseModel


# --- Response schemas ---

class CurriculumDocumentResponse(BaseModel):
    id: str
    filename: str
    original_filename: str
    file_size: int
    file_hash: str
    education_level: str | None
    subject_name: str | None
    description: str | None
    status: str
    error_message: str | None
    page_count: int | None
    chunk_count: int
    created_at: str
    updated_at: str

    class Config:
        from_attributes = True


class CurriculumDocumentListResponse(BaseModel):
    documents: list[CurriculumDocumentResponse]
    total: int


class CurriculumChunkResponse(BaseModel):
    id: str
    document_id: str
    chunk_index: int
    content: str
    section_title: str | None
    heading_hierarchy: str | None
    similarity_score: float | None = None


class CurriculumSearchResult(BaseModel):
    chunk: CurriculumChunkResponse
    document_filename: str
    document_education_level: str | None
    document_subject_name: str | None


class CurriculumSearchResponse(BaseModel):
    results: list[CurriculumSearchResult]
    query: str


class CurriculumSearchRequest(BaseModel):
    query: str
    education_level: str | None = None
    subject_name: str | None = None
    top_k: int = 10


class ComplianceQuestionResult(BaseModel):
    question_index: int
    question_text: str
    matched_requirements: list[dict]


class ComplianceResponse(BaseModel):
    questions: list[ComplianceQuestionResult]
    coverage_summary: dict
    generated_at: str


class CurriculumStatusResponse(BaseModel):
    status: str
    chunk_count: int
    error_message: str | None
