"""Document model (finalized DOCX files)."""

from __future__ import annotations

from datetime import datetime, timezone
from uuid import uuid4

from sqlalchemy import String, Text, Integer, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class Document(Base):
    __tablename__ = "documents"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid4()))
    generation_id: Mapped[str] = mapped_column(String(36), ForeignKey("generations.id", ondelete="CASCADE"), nullable=False, index=True)
    filename: Mapped[str] = mapped_column(Text, nullable=False)
    file_path: Mapped[str] = mapped_column(Text, nullable=False)
    variants_count: Mapped[int] = mapped_column(Integer, nullable=False)
    created_at: Mapped[str] = mapped_column(String, nullable=False, default=lambda: datetime.now(timezone.utc).isoformat(), index=True)
    deleted_at: Mapped[str | None] = mapped_column(String, nullable=True)

    # Relationships
    generation = relationship("Generation", back_populates="documents")
