"""Authentication schemas."""

from __future__ import annotations

from pydantic import BaseModel, field_validator


class LoginRequest(BaseModel):
    password: str


class LoginResponse(BaseModel):
    token: str
    expires_at: str
    must_change_password: bool = False


class ChangePasswordRequest(BaseModel):
    new_password: str

    @field_validator("new_password")
    @classmethod
    def password_strength(cls, v: str) -> str:
        if len(v) < 8:
            raise ValueError("Hasło musi mieć co najmniej 8 znaków")
        return v


class ChangePasswordResponse(BaseModel):
    detail: str = "Hasło zostało zmienione"


class LogoutResponse(BaseModel):
    detail: str = "Logged out successfully"
