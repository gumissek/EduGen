"""Verification token model for email change and password change verification."""

from __future__ import annotations

from datetime import datetime, timezone
from uuid import uuid4

from sqlalchemy import String, Text, Boolean, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class VerificationToken(Base):
    __tablename__ = "verification_tokens"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid4()))
    user_id: Mapped[str] = mapped_column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    token: Mapped[str] = mapped_column(String(255), unique=True, nullable=False, index=True)
    token_type: Mapped[str] = mapped_column(String(50), nullable=False)  # 'email_change' | 'password_change'
    payload_json: Mapped[str | None] = mapped_column(Text, nullable=True)  # JSON with extra data (e.g. new_email)
    expires_at: Mapped[str] = mapped_column(Text, nullable=False)
    is_used: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    created_at: Mapped[str] = mapped_column(Text, nullable=False, default=lambda: datetime.now(timezone.utc).isoformat())

    # Relationships
    user = relationship("User", backref="verification_tokens")
