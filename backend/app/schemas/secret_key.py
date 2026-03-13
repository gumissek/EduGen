"""Secret key schemas."""

from __future__ import annotations

from typing import Optional

from pydantic import BaseModel, field_validator


class SecretKeyCreate(BaseModel):
    platform: str  # e.g. 'openrouter'
    key_name: str  # user-friendly label, e.g. 'My OpenRouter Key'
    secret_key: str  # AES-256-GCM encrypted key (base64), decrypted server-side

    @field_validator("platform")
    @classmethod
    def validate_platform(cls, v: str) -> str:
        v = v.strip().lower()
        if not v:
            raise ValueError("Platforma jest wymagana")
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
        return v


class TransportKeyResponse(BaseModel):
    key: str  # base64-encoded AES-256 key


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
