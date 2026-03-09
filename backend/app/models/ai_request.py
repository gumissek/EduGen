"""AI request log model."""

from __future__ import annotations

from datetime import datetime, timezone
from uuid import uuid4

from sqlalchemy import String, Text, Integer, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class AIRequest(Base):
    __tablename__ = "ai_requests"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid4()))
    generation_id: Mapped[str | None] = mapped_column(String(36), ForeignKey("generations.id", ondelete="SET NULL"), nullable=True, index=True)
    model_name: Mapped[str] = mapped_column(String(100), nullable=False)
    prompt_tokens: Mapped[int | None] = mapped_column(Integer, nullable=True)
    completion_tokens: Mapped[int | None] = mapped_column(Integer, nullable=True)
    total_tokens: Mapped[int | None] = mapped_column(Integer, nullable=True)
    request_type: Mapped[str] = mapped_column(String(50), nullable=False)
    request_payload: Mapped[str | None] = mapped_column(Text, nullable=True)  # JSON string
    response_payload: Mapped[str | None] = mapped_column(Text, nullable=True)  # JSON string
    created_at: Mapped[str] = mapped_column(String, nullable=False, default=lambda: datetime.now(timezone.utc).isoformat(), index=True)

    # Relationships
    generation = relationship("Generation", back_populates="ai_requests")
