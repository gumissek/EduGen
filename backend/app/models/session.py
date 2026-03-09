"""Session model."""

from __future__ import annotations

from datetime import datetime, timezone
from uuid import uuid4

from sqlalchemy import String, Text, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class Session(Base):
    __tablename__ = "sessions"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid4()))
    user_id: Mapped[str] = mapped_column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    token: Mapped[str] = mapped_column(Text, nullable=False, unique=True)
    created_at: Mapped[str] = mapped_column(String, nullable=False, default=lambda: datetime.now(timezone.utc).isoformat())
    expires_at: Mapped[str] = mapped_column(String, nullable=False, index=True)
    last_activity_at: Mapped[str] = mapped_column(String, nullable=False, default=lambda: datetime.now(timezone.utc).isoformat())

    # Relationships
    user = relationship("User", back_populates="sessions")
