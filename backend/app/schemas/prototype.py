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
    created_at: str
    updated_at: str

    class Config:
        from_attributes = True


class PrototypeUpdate(BaseModel):
    edited_content: str


class RepromptRequest(BaseModel):
    prompt: str
