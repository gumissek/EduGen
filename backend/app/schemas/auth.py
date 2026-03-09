"""Authentication schemas."""

from __future__ import annotations

from pydantic import BaseModel


class LoginRequest(BaseModel):
    password: str


class LoginResponse(BaseModel):
    token: str
    expires_at: str


class LogoutResponse(BaseModel):
    detail: str = "Logged out successfully"
