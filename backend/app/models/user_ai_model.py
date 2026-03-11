"""User AI models — per-user list of AI provider/model configurations."""

from __future__ import annotations

from datetime import datetime, timezone
from uuid import uuid4

from sqlalchemy import String, Text, Boolean, Integer, ForeignKey, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class UserAIModel(Base):
    __tablename__ = "user_ai_models"
    __table_args__ = (
        UniqueConstraint("user_id", "provider", "model_name", name="uq_user_ai_models_user_provider_model"),
    )

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid4()))
    user_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    provider: Mapped[str] = mapped_column(String(100), nullable=False)
    model_name: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    price_description: Mapped[str | None] = mapped_column(Text, nullable=True)
    is_available: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    created_at: Mapped[str] = mapped_column(
        String, nullable=False, default=lambda: datetime.now(timezone.utc).isoformat()
    )
    changed_at: Mapped[str | None] = mapped_column(String, nullable=True)
    request_made: Mapped[int] = mapped_column(Integer, nullable=False, default=0)

    # Relationships
    user = relationship("User", back_populates="ai_models")
