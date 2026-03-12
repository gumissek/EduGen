"""Settings schemas."""

from __future__ import annotations

from typing import Optional

from pydantic import BaseModel


class SettingsResponse(BaseModel):
    default_model: str
    has_api_key: bool


class SettingsUpdate(BaseModel):
    default_model: Optional[str] = None
