"""Add curriculum vector database tables

Revision ID: 004
Revises: 003
Create Date: 2026-03-14
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "004"
down_revision: Union[str, None] = "003"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Enable pgvector extension
    op.execute("CREATE EXTENSION IF NOT EXISTS vector")

    # curriculum_documents table
    op.create_table(
        "curriculum_documents",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("filename", sa.Text(), nullable=False),
        sa.Column("original_filename", sa.Text(), nullable=False),
        sa.Column("file_path", sa.Text(), nullable=False),
        sa.Column("markdown_path", sa.Text(), nullable=True),
        sa.Column("file_size", sa.Integer(), nullable=False),
        sa.Column("file_hash", sa.String(64), nullable=False),
        sa.Column("education_level", sa.String(50), nullable=True),
        sa.Column("subject_name", sa.String(255), nullable=True),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("status", sa.String(20), nullable=False, server_default="uploaded"),
        sa.Column("error_message", sa.Text(), nullable=True),
        sa.Column("page_count", sa.Integer(), nullable=True),
        sa.Column("chunk_count", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("uploaded_by", sa.String(36), sa.ForeignKey("users.id", ondelete="SET NULL"), nullable=True),
        sa.Column("created_at", sa.Text(), nullable=False),
        sa.Column("updated_at", sa.Text(), nullable=False),
    )
    op.create_index("ix_curriculum_documents_status", "curriculum_documents", ["status"])
    op.create_index("ix_curriculum_documents_education_level", "curriculum_documents", ["education_level"])

    # curriculum_chunks table
    op.create_table(
        "curriculum_chunks",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("document_id", sa.String(36), sa.ForeignKey("curriculum_documents.id", ondelete="CASCADE"), nullable=False),
        sa.Column("chunk_index", sa.Integer(), nullable=False),
        sa.Column("content", sa.Text(), nullable=False),
        sa.Column("content_hash", sa.String(64), nullable=False),
        sa.Column("heading_hierarchy", sa.Text(), nullable=True),
        sa.Column("section_title", sa.Text(), nullable=True),
        sa.Column("page_numbers", sa.Text(), nullable=True),
        sa.Column("metadata_json", sa.Text(), nullable=True),
        sa.Column("created_at", sa.Text(), nullable=False),
    )
    op.create_index("ix_curriculum_chunks_document_id", "curriculum_chunks", ["document_id"])
    op.create_index("ix_curriculum_chunks_content_hash", "curriculum_chunks", ["content_hash"])
    op.create_unique_constraint("uq_curriculum_chunks_doc_index", "curriculum_chunks", ["document_id", "chunk_index"])

    # Add vector column (pgvector type, not native SQLAlchemy)
    op.execute("ALTER TABLE curriculum_chunks ADD COLUMN embedding vector(3072)")

    # HNSW index for cosine similarity
    op.execute(
        "CREATE INDEX ix_curriculum_chunks_embedding ON curriculum_chunks "
        "USING hnsw (embedding vector_cosine_ops) "
        "WITH (m = 16, ef_construction = 64)"
    )

    # Add compliance_json to prototypes
    op.add_column("prototypes", sa.Column("compliance_json", sa.Text(), nullable=True))

    # Add curriculum_compliance_enabled to generations
    op.add_column("generations", sa.Column("curriculum_compliance_enabled", sa.Boolean(), nullable=False, server_default="false"))


def downgrade() -> None:
    op.drop_column("generations", "curriculum_compliance_enabled")
    op.drop_column("prototypes", "compliance_json")
    op.execute("DROP INDEX IF EXISTS ix_curriculum_chunks_embedding")
    op.drop_table("curriculum_chunks")
    op.drop_table("curriculum_documents")
    op.execute("DROP EXTENSION IF EXISTS vector")
