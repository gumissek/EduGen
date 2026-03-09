"""User model."""

from __future__ import annotations

from datetime import datetime, timezone
from uuid import uuid4

from sqlalchemy import String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class User(Base):
    __tablename__ = "users"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid4()))
    password_hash: Mapped[str] = mapped_column(Text, nullable=False)
    must_change_password: Mapped[bool] = mapped_column(default=True, nullable=False, server_default="1")
    created_at: Mapped[str] = mapped_column(String, nullable=False, default=lambda: datetime.now(timezone.utc).isoformat())
    updated_at: Mapped[str] = mapped_column(String, nullable=False, default=lambda: datetime.now(timezone.utc).isoformat())
    last_login_at: Mapped[str | None] = mapped_column(String, nullable=True)

    # Relationships
    sessions = relationship("Session", back_populates="user", cascade="all, delete-orphan")
    settings = relationship("UserSettings", back_populates="user", cascade="all, delete-orphan")
