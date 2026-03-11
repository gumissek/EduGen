"""User model."""

from __future__ import annotations

from datetime import datetime, timezone
from uuid import uuid4

from sqlalchemy import String, Text, Integer, Boolean, DateTime
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class User(Base):
    __tablename__ = "users"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid4()))
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True, nullable=False)
    first_name: Mapped[str | None] = mapped_column(String(255), nullable=True)
    last_name: Mapped[str | None] = mapped_column(String(255), nullable=True)
    password_hash: Mapped[str] = mapped_column(Text, nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    is_superuser: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    created_at: Mapped[str] = mapped_column(String, nullable=False, default=lambda: datetime.now(timezone.utc).isoformat())
    updated_at: Mapped[str] = mapped_column(String, nullable=False, default=lambda: datetime.now(timezone.utc).isoformat())
    last_login_at: Mapped[str | None] = mapped_column(String, nullable=True)

    # Premium & quota
    premium_level: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    api_quota: Mapped[int] = mapped_column(Integer, default=1000, nullable=False)
    api_quota_reset: Mapped[str | None] = mapped_column(String, nullable=True)

    # Email verification
    is_email_verified: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    email_verification_token: Mapped[str | None] = mapped_column(String(255), nullable=True)
    email_verification_token_expiry: Mapped[str | None] = mapped_column(String, nullable=True)

    # Password reset
    reset_password_token: Mapped[str | None] = mapped_column(String(255), nullable=True)
    reset_password_token_expiry: Mapped[str | None] = mapped_column(String, nullable=True)
    last_password_change: Mapped[str | None] = mapped_column(String, nullable=True, default=lambda: datetime.now(timezone.utc).isoformat())

    # Security
    failed_login_attempts: Mapped[int] = mapped_column(Integer, default=0, nullable=False)

    # AI model preference
    default_model: Mapped[str] = mapped_column(String(100), nullable=False, default="openai/gpt-5-mini")

    # Relationships
    secret_keys = relationship("SecretKey", back_populates="user", cascade="all, delete-orphan")
    subjects = relationship("Subject", back_populates="user")
    generations = relationship("Generation", back_populates="user")
    source_files = relationship("SourceFile", back_populates="user")
    documents = relationship("Document", back_populates="user")
    prototypes = relationship("Prototype", back_populates="user")
    ai_models = relationship("UserAIModel", back_populates="user", cascade="all, delete-orphan")
