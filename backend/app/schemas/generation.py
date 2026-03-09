"""Generation schemas."""

from __future__ import annotations

from typing import Optional, List

from pydantic import BaseModel, field_validator


class GenerationCreate(BaseModel):
    subject_id: str
    content_type: str  # karta_pracy, sprawdzian, kartkowka, test, materialy
    education_level: str  # podstawowa, srednia
    class_level: int
    language_level: Optional[str] = None  # A1-C2
    topic: str
    instructions: Optional[str] = None
    difficulty: int  # 1-4
    total_questions: int
    open_questions: int
    closed_questions: int
    variants_count: int = 1
    source_file_ids: List[str] = []

    @field_validator("difficulty")
    @classmethod
    def validate_difficulty(cls, v: int) -> int:
        if v < 1 or v > 4:
            raise ValueError("Difficulty must be between 1 and 4")
        return v

    @field_validator("variants_count")
    @classmethod
    def validate_variants(cls, v: int) -> int:
        if v < 1:
            raise ValueError("Variants count must be at least 1")
        return v

    @field_validator("closed_questions")
    @classmethod
    def validate_questions(cls, v: int, info) -> int:
        data = info.data
        content_type = data.get("content_type", "")
        free_form_types = {"worksheet", "lesson_materials"}
        if content_type in free_form_types:
            return v  # no validation for free-form types
        if "total_questions" in data and "open_questions" in data:
            if data["open_questions"] + v != data["total_questions"]:
                raise ValueError("total_questions must equal open_questions + closed_questions")
        return v


class GenerationResponse(BaseModel):
    id: str
    subject_id: str
    content_type: str
    education_level: str
    class_level: int
    language_level: Optional[str] = None
    topic: str
    instructions: Optional[str] = None
    difficulty: int
    total_questions: int
    open_questions: int
    closed_questions: int
    variants_count: int
    status: str
    error_message: Optional[str] = None
    created_at: str
    updated_at: str

    class Config:
        from_attributes = True


class GenerationListResponse(BaseModel):
    generations: List[GenerationResponse]
    total: int
