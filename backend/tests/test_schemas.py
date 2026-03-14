"""Tests for Pydantic schemas — validation logic."""

from __future__ import annotations

import pytest
from pydantic import ValidationError

from app.schemas.auth import RegisterRequest, ChangePasswordRequest, RequestPasswordChangeCodeRequest
from app.schemas.generation import GenerationCreate
from app.schemas.subject import SubjectCreate


class TestRegisterRequestSchema:
    def test_valid(self):
        req = RegisterRequest(email="a@b.com", password="LongEnough1")
        assert req.email == "a@b.com"

    def test_short_password_rejected(self):
        with pytest.raises(ValidationError):
            RegisterRequest(email="a@b.com", password="short")

    def test_invalid_email_rejected(self):
        with pytest.raises(ValidationError):
            RegisterRequest(email="notanemail", password="LongEnough1")


class TestGenerationCreateSchema:
    _VALID = {
        "subject_id": "subj-1",
        "content_type": "test",
        "education_level": "primary",
        "class_level": "Klasa 4",
        "topic": "Dodawanie",
        "difficulty": 2,
        "total_questions": 5,
        "open_questions": 2,
        "closed_questions": 3,
    }

    def test_valid_creation(self):
        gen = GenerationCreate(**self._VALID)
        assert gen.content_type == "test"

    def test_difficulty_upper_bound_valid(self):
        data = {**self._VALID, "difficulty": 5}
        gen = GenerationCreate(**data)
        assert gen.difficulty == 5

    def test_invalid_content_type(self):
        data = {**self._VALID, "content_type": "invalid_type"}
        with pytest.raises(ValidationError):
            GenerationCreate(**data)

    def test_difficulty_out_of_range(self):
        data = {**self._VALID, "difficulty": 6}
        with pytest.raises(ValidationError):
            GenerationCreate(**data)

    def test_variants_count_too_high(self):
        data = {**self._VALID, "variants_count": 10}
        with pytest.raises(ValidationError):
            GenerationCreate(**data)

    def test_negative_questions_rejected(self):
        data = {**self._VALID, "total_questions": -1}
        with pytest.raises(ValidationError):
            GenerationCreate(**data)

    def test_empty_topic_rejected(self):
        data = {**self._VALID, "topic": ""}
        with pytest.raises(ValidationError):
            GenerationCreate(**data)

    def test_topic_too_long_rejected(self):
        data = {**self._VALID, "topic": "X" * 501}
        with pytest.raises(ValidationError):
            GenerationCreate(**data)

    def test_empty_class_level_rejected(self):
        data = {**self._VALID, "class_level": ""}
        with pytest.raises(ValidationError):
            GenerationCreate(**data)

    def test_worksheet_skips_question_validation(self):
        data = {**self._VALID, "content_type": "worksheet",
                "total_questions": 0, "open_questions": 0, "closed_questions": 0}
        gen = GenerationCreate(**data)
        assert gen.content_type == "worksheet"


class TestSubjectCreateSchema:
    def test_valid(self):
        s = SubjectCreate(name="Matematyka")
        assert s.name == "Matematyka"

    def test_empty_name_rejected(self):
        with pytest.raises(ValidationError):
            SubjectCreate(name="")

    def test_special_chars_rejected(self):
        with pytest.raises(ValidationError):
            SubjectCreate(name="Bad!@#")

    def test_polish_chars_allowed(self):
        s = SubjectCreate(name="Język źródeł")
        assert "ź" in s.name


class TestChangePasswordSchema:
    def test_weak_new_password_rejected(self):
        with pytest.raises(ValidationError):
            ChangePasswordRequest(current_password="old", new_password="short")

    def test_valid(self):
        req = ChangePasswordRequest(current_password="old", new_password="NewStrongPass1")
        assert req.new_password == "NewStrongPass1"
