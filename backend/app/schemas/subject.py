"""Subject schemas."""

from __future__ import annotations

import re
from typing import Optional

from pydantic import BaseModel, field_validator


_SUBJECT_NAME_PATTERN = re.compile(r"^[a-zA-ZąćęłńóśźżĄĆĘŁŃÓŚŹŻ0-9 \-]+$")


class SubjectCreate(BaseModel):
    name: str

    @field_validator("name")
    @classmethod
    def validate_name(cls, v: str) -> str:
        v = v.strip()
        if not v:
            raise ValueError("Subject name must not be empty")
        if not _SUBJECT_NAME_PATTERN.match(v):
            raise ValueError("Subject name contains invalid characters")
        return v


class SubjectResponse(BaseModel):
    id: str
    name: str
    is_custom: bool
    created_at: str

    class Config:
        from_attributes = True

    @field_validator("is_custom", mode="before")
    @classmethod
    def int_to_bool(cls, v):
        if isinstance(v, int):
            return bool(v)
        return v
