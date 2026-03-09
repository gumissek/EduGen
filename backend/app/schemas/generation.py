"""Generation schemas."""

from __future__ import annotations

from typing import Optional, List

from pydantic import BaseModel, field_validator


class GenerationCreate(BaseModel):
    subject_id: str
    content_type: str  # worksheet, test, quiz, exam, lesson_materials
    education_level: str  # primary, secondary or custom string
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

    @field_validator('subject_id', mode='before')
    @classmethod
    def validate_subject_id(cls, v: str) -> str:
        if not v or not str(v).strip():
            raise ValueError('Przedmiot jest wymagany')
        return str(v).strip()

    @field_validator('education_level', mode='before')
    @classmethod
    def validate_education_level(cls, v: str) -> str:
        if not v or not str(v).strip():
            raise ValueError('Poziom edukacji jest wymagany')
        return str(v).strip()

    @field_validator('class_level', mode='before')
    @classmethod
    def validate_class_level(cls, v) -> int:
        try:
            n = int(v)
        except (TypeError, ValueError):
            raise ValueError('Klasa musi być liczbą całkowitą')
        if n < 1:
            raise ValueError('Klasa musi być większa od 0')
        return n

    @field_validator('topic', mode='before')
    @classmethod
    def validate_topic(cls, v: str) -> str:
        if not v or not str(v).strip():
            raise ValueError('Temat jest wymagany')
        if len(str(v).strip()) > 500:
            raise ValueError('Temat nie może przekraczać 500 znaków')
        return str(v).strip()

    @field_validator('content_type', mode='before')
    @classmethod
    def validate_content_type(cls, v: str) -> str:
        allowed = {'worksheet', 'test', 'quiz', 'exam', 'lesson_materials'}
        if v not in allowed:
            raise ValueError(f'Nieprawidłowy typ treści. Dozwolone: {", ".join(sorted(allowed))}')
        return v

    @field_validator('difficulty')
    @classmethod
    def validate_difficulty(cls, v: int) -> int:
        if v < 1 or v > 4:
            raise ValueError('Trudność musi być między 1 a 4')
        return v

    @field_validator('variants_count')
    @classmethod
    def validate_variants(cls, v: int) -> int:
        if v < 1:
            raise ValueError('Liczba wariantów musi wynosić co najmniej 1')
        if v > 6:
            raise ValueError('Liczba wariantów nie może przekraczać 6')
        return v

    @field_validator('total_questions', 'open_questions', 'closed_questions', mode='before')
    @classmethod
    def validate_question_counts(cls, v) -> int:
        try:
            n = int(v)
        except (TypeError, ValueError):
            raise ValueError('Liczba pytań musi być liczbą całkowitą')
        if n < 0:
            raise ValueError('Liczba pytań nie może być ujemna')
        if n > 50:
            raise ValueError('Liczba pytań nie może przekraczać 50')
        return n

    @field_validator('closed_questions')
    @classmethod
    def validate_questions(cls, v: int, info) -> int:
        data = info.data
        content_type = data.get('content_type', '')
        free_form_types = {'worksheet', 'lesson_materials'}
        if content_type in free_form_types:
            return v  # no validation for free-form types
        if 'total_questions' in data and 'open_questions' in data:
            if data['open_questions'] + v != data['total_questions']:
                raise ValueError('Suma pytań otwartych i zamkniętych musi być równa łącznej liczbie pytań')
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
