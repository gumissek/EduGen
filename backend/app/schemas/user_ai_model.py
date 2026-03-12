"""Pydantic schemas for UserAIModel."""

from __future__ import annotations

from pydantic import BaseModel, field_validator


class UserAIModelCreate(BaseModel):
    provider: str
    model_name: str
    description: str | None = None
    price_description: str | None = None

    @field_validator("provider", mode="before")
    @classmethod
    def lowercase_provider(cls, v: str) -> str:
        if not v or not v.strip():
            raise ValueError("Provider nie może być pusty")
        return v.strip().lower()

    @field_validator("model_name", mode="before")
    @classmethod
    def lowercase_model_name(cls, v: str) -> str:
        if not v or not v.strip():
            raise ValueError("Nazwa modelu nie może być pusta")
        return v.strip().lower()


class UserAIModelResponse(BaseModel):
    id: str
    user_id: str
    provider: str
    model_name: str
    description: str | None
    price_description: str | None
    is_available: bool
    created_at: str
    changed_at: str | None
    request_made: int

    model_config = {"from_attributes": True}
