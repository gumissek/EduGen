"""Prototype schemas."""

from __future__ import annotations

from typing import Optional

from pydantic import BaseModel


class PrototypeResponse(BaseModel):
    id: str
    generation_id: str
    original_content: str
    edited_content: Optional[str] = None
    answer_key: str
    comments_json: Optional[str] = None
    created_at: str
    updated_at: str

    class Config:
        from_attributes = True


class PrototypeUpdate(BaseModel):
    edited_content: str
    comments_json: Optional[str] = None


class RepromptRequest(BaseModel):
    prompt: str


class PrototypeListItemResponse(BaseModel):
    id: str
    generation_id: str
    subject_id: str
    subject_name: str
    title: str
    content_type: str
    education_level: str
    class_level: str
    created_at: str
    updated_at: str

    class Config:
        from_attributes = True


class PrototypeListResponse(BaseModel):
    prototypes: list[PrototypeListItemResponse]
    total: int
