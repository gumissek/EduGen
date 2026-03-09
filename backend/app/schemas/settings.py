"""Settings schemas."""

from __future__ import annotations

from typing import Optional, List

from pydantic import BaseModel


class SettingsResponse(BaseModel):
    default_model: str
    has_api_key: bool


class SettingsUpdate(BaseModel):
    openai_api_key: Optional[str] = None
    default_model: Optional[str] = None


class ValidateKeyRequest(BaseModel):
    openai_api_key: str


class ValidateKeyResponse(BaseModel):
    valid: bool
    models: List[str] = []
    error: Optional[str] = None
