"""Generation model."""

from __future__ import annotations

from datetime import datetime, timezone
from uuid import uuid4

from sqlalchemy import String, Text, Integer, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class Generation(Base):
    __tablename__ = "generations"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid4()))
    subject_id: Mapped[str] = mapped_column(String(36), ForeignKey("subjects.id"), nullable=False, index=True)
    content_type: Mapped[str] = mapped_column(String(50), nullable=False)
    education_level: Mapped[str] = mapped_column(String(255), nullable=False)
    class_level: Mapped[str] = mapped_column(String(100), nullable=False)
    language_level: Mapped[str | None] = mapped_column(String(10), nullable=True)
    topic: Mapped[str] = mapped_column(Text, nullable=False)
    instructions: Mapped[str | None] = mapped_column(Text, nullable=True)
    difficulty: Mapped[int] = mapped_column(Integer, nullable=False)
    total_questions: Mapped[int] = mapped_column(Integer, nullable=False)
    open_questions: Mapped[int] = mapped_column(Integer, nullable=False)
    closed_questions: Mapped[int] = mapped_column(Integer, nullable=False)
    variants_count: Mapped[int] = mapped_column(Integer, nullable=False, default=1)
    created_at: Mapped[str] = mapped_column(String, nullable=False, default=lambda: datetime.now(timezone.utc).isoformat(), index=True)
    updated_at: Mapped[str] = mapped_column(String, nullable=False, default=lambda: datetime.now(timezone.utc).isoformat())
    status: Mapped[str] = mapped_column(String(20), nullable=False, default="draft", index=True)
    error_message: Mapped[str | None] = mapped_column(Text, nullable=True)

    # Relationships
    subject = relationship("Subject", back_populates="generations")
    prototype = relationship("Prototype", back_populates="generation", uselist=False, cascade="all, delete-orphan")
    documents = relationship("Document", back_populates="generation", cascade="all, delete-orphan")
    ai_requests = relationship("AIRequest", back_populates="generation")
    source_files = relationship("SourceFile", secondary="generation_source_files", back_populates="generations")
