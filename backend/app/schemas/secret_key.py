"""Secret key schemas."""

from __future__ import annotations

from typing import Optional

from pydantic import BaseModel, field_validator

ALLOWED_PLATFORMS = {"openrouter"}
_MAX_SECRET_KEY_LEN = 512  # well above any real OpenRouter key length


class SecretKeyCreate(BaseModel):
    platform: str  # e.g. 'openrouter'
    key_name: str  # user-friendly label, e.g. 'My OpenRouter Key'
    secret_key: str  # plain-text key — will be encrypted server-side

    @field_validator("platform")
    @classmethod
    def validate_platform(cls, v: str) -> str:
        v = v.strip().lower()
        if not v:
            raise ValueError("Platforma jest wymagana")
        if v not in ALLOWED_PLATFORMS:
            raise ValueError(f"Nieobsługiwana platforma. Dozwolone: {', '.join(sorted(ALLOWED_PLATFORMS))}")
        return v

    @field_validator("key_name")
    @classmethod
    def validate_key_name(cls, v: str) -> str:
        v = v.strip()
        if not v:
            raise ValueError("Nazwa klucza jest wymagana")
        if len(v) > 255:
            raise ValueError("Nazwa klucza nie może przekraczać 255 znaków")
        return v

    @field_validator("secret_key")
    @classmethod
    def validate_secret_key(cls, v: str) -> str:
        v = v.strip()
        if not v:
            raise ValueError("Klucz API jest wymagany")
        if len(v) > _MAX_SECRET_KEY_LEN:
            raise ValueError(f"Klucz API nie może przekraczać {_MAX_SECRET_KEY_LEN} znaków")
        return v


class SecretKeyResponse(BaseModel):
    id: str
    platform: str
    key_name: str
    is_active: bool
    last_used_at: Optional[str] = None
    created_at: str

    class Config:
        from_attributes = True


class SecretKeyValidateResponse(BaseModel):
    valid: bool
    error: Optional[str] = None
