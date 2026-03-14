"""Curriculum chunk model — chunked text with vector embeddings."""

from __future__ import annotations

from datetime import datetime, timezone
from uuid import uuid4

from sqlalchemy import String, Text, Integer, ForeignKey, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class CurriculumChunk(Base):
    __tablename__ = "curriculum_chunks"
    __table_args__ = (
        UniqueConstraint("document_id", "chunk_index", name="uq_curriculum_chunks_doc_index"),
    )

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid4()))
    document_id: Mapped[str] = mapped_column(
        String(36),
        ForeignKey("curriculum_documents.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    chunk_index: Mapped[int] = mapped_column(Integer, nullable=False)
    content: Mapped[str] = mapped_column(Text, nullable=False)
    content_hash: Mapped[str] = mapped_column(String(64), nullable=False, index=True)
    heading_hierarchy: Mapped[str | None] = mapped_column(Text, nullable=True)  # JSON array string
    section_title: Mapped[str | None] = mapped_column(Text, nullable=True)
    page_numbers: Mapped[str | None] = mapped_column(Text, nullable=True)
    metadata_json: Mapped[str | None] = mapped_column(Text, nullable=True)
    # embedding column uses pgvector's vector type, added via raw SQL in migration
    created_at: Mapped[str] = mapped_column(String, nullable=False, default=lambda: datetime.now(timezone.utc).isoformat())

    document = relationship("CurriculumDocument", back_populates="chunks")
