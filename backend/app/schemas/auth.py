"""Authentication schemas."""

from __future__ import annotations

from pydantic import BaseModel, EmailStr, field_validator


class RegisterRequest(BaseModel):
    email: EmailStr
    password: str
    first_name: str | None = None
    last_name: str | None = None

    @field_validator("password")
    @classmethod
    def password_strength(cls, v: str) -> str:
        if len(v) < 8:
            raise ValueError("Hasło musi mieć co najmniej 8 znaków")
        return v


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class LoginResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"


class UserResponse(BaseModel):
    id: str
    email: str
    first_name: str | None = None
    last_name: str | None = None
    is_active: bool = True
    is_superuser: bool = False
    created_at: str
    api_quota: int = 1000
    api_quota_reset: str | None = None
    has_secret_keys: bool = False


class LogoutResponse(BaseModel):
    detail: str = "Wylogowano pomyślnie"


class UpdateProfileRequest(BaseModel):
    email: EmailStr | None = None
    first_name: str | None = None
    last_name: str | None = None


class ChangePasswordRequest(BaseModel):
    current_password: str
    new_password: str

    @field_validator("new_password")
    @classmethod
    def password_strength(cls, v: str) -> str:
        if len(v) < 8:
            raise ValueError("Hasło musi mieć co najmniej 8 znaków")
        return v


class UserStatsResponse(BaseModel):
    documents_count: int
    ai_requests_count: int
    generations_count: int
    failed_generations_count: int


# ── Email change verification ──


class RequestEmailChangeRequest(BaseModel):
    new_email: EmailStr
    password: str


class RequestEmailChangeResponse(BaseModel):
    detail: str = "Link weryfikacyjny został wysłany na nowy adres e-mail (ważny 24h)"
    email_sent: bool = True
    # Populated only when email_sent=False (local/dev mode) so the user can act on the link
    verification_link: str | None = None


class ConfirmEmailChangeResponse(BaseModel):
    detail: str = "Adres e-mail został pomyślnie zmieniony"


# ── Password change verification ──


class RequestPasswordChangeCodeRequest(BaseModel):
    current_password: str
    new_password: str

    @field_validator("new_password")
    @classmethod
    def password_strength(cls, v: str) -> str:
        if len(v) < 8:
            raise ValueError("Hasło musi mieć co najmniej 8 znaków")
        return v


class RequestPasswordChangeCodeResponse(BaseModel):
    detail: str = "Kod weryfikacyjny został wysłany na Twój adres e-mail (ważny 5 minut)"


class ConfirmPasswordChangeRequest(BaseModel):
    code: str
    new_password: str

    @field_validator("new_password")
    @classmethod
    def password_strength(cls, v: str) -> str:
        if len(v) < 8:
            raise ValueError("Hasło musi mieć co najmniej 8 znaków")
        return v


class ConfirmPasswordChangeResponse(BaseModel):
    detail: str = "Hasło zostało pomyślnie zmienione"
