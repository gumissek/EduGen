"""Admin schemas."""

from __future__ import annotations

from typing import Optional

from pydantic import BaseModel, EmailStr, field_validator


class AdminUserResponse(BaseModel):
    id: str
    email: EmailStr
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    is_active: bool
    is_superuser: bool
    premium_level: int
    api_quota: int
    default_model: str
    created_at: str
    updated_at: str

    class Config:
        from_attributes = True


class AdminUserListResponse(BaseModel):
    users: list[AdminUserResponse]
    total: int
    page: int
    per_page: int


class AdminUserUpdateRequest(BaseModel):
    email: Optional[EmailStr] = None
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    is_active: Optional[bool] = None
    is_superuser: Optional[bool] = None
    premium_level: Optional[int] = None
    api_quota: Optional[int] = None
    default_model: Optional[str] = None

    @field_validator("premium_level", mode="before")
    @classmethod
    def validate_premium_level(cls, value):
        if value is None:
            return value
        ivalue = int(value)
        if ivalue < 0:
            raise ValueError("premium_level must be >= 0")
        return ivalue

    @field_validator("api_quota", mode="before")
    @classmethod
    def validate_api_quota(cls, value):
        if value is None:
            return value
        ivalue = int(value)
        if ivalue < 0:
            raise ValueError("api_quota must be >= 0")
        return ivalue


class AdminResetPasswordRequest(BaseModel):
    new_password: str

    @field_validator("new_password")
    @classmethod
    def validate_password_length(cls, value: str) -> str:
        if len(value) < 8:
            raise ValueError("Password must have at least 8 characters")
        return value


class AdminSimpleMessageResponse(BaseModel):
    detail: str
