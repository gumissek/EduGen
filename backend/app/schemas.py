from datetime import datetime
from typing import Literal

from pydantic import BaseModel, Field


class LoginRequest(BaseModel):
    password: str


class LoginResponse(BaseModel):
    token: str
    expires_at: datetime


class SettingsResponse(BaseModel):
    default_model: str
    has_api_key: bool


class SettingsUpdate(BaseModel):
    openai_api_key: str | None = None
    default_model: str


class SubjectCreate(BaseModel):
    name: str = Field(min_length=2, max_length=255)


class SubjectOut(BaseModel):
    id: str
    name: str
    is_custom: bool


class SourceFileOut(BaseModel):
    id: str
    filename: str
    summary: str | None
    file_type: str
    subject_id: str


class GenerationParams(BaseModel):
    subject_id: str
    content_type: Literal["worksheet", "exam", "quiz", "test", "lesson_materials"]
    education_level: Literal["sp", "lo"]
    class_level: int = Field(ge=1, le=8)
    language_level: str | None = None
    topic: str
    instructions: str | None = None
    difficulty: int = Field(ge=1, le=4, default=2)
    total_questions: int = Field(ge=0, default=0)
    open_questions: int = Field(ge=0, default=0)
    closed_questions: int = Field(ge=0, default=0)
    variants_count: int = Field(ge=1, default=1)
    source_file_ids: list[str] = Field(default_factory=list)


class GenerationResponse(BaseModel):
    id: str
    status: str


class GenerationStatusResponse(BaseModel):
    id: str
    status: str


class PrototypeOut(BaseModel):
    original_content: str
    edited_content: str | None
    answer_key: str


class PrototypeUpdate(BaseModel):
    edited_content: str


class RepromptRequest(BaseModel):
    prompt: str = Field(min_length=2)


class FinalizeResponse(BaseModel):
    status: str
    document_id: str | None = None


class BulkDownloadRequest(BaseModel):
    document_ids: list[str]


class BackupOut(BaseModel):
    id: str
    backup_path: str
    created_at: datetime
    expires_at: datetime
