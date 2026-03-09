"""Initial schema

Revision ID: 001
Revises:
Create Date: 2026-03-09

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "001"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # --- users ---
    op.create_table(
        "users",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("password_hash", sa.Text, nullable=False),
        sa.Column("created_at", sa.String, nullable=False),
        sa.Column("updated_at", sa.String, nullable=False),
        sa.Column("last_login_at", sa.String, nullable=True),
    )

    # --- sessions ---
    op.create_table(
        "sessions",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("user_id", sa.String(36), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("token", sa.Text, nullable=False, unique=True),
        sa.Column("created_at", sa.String, nullable=False),
        sa.Column("expires_at", sa.String, nullable=False),
        sa.Column("last_activity_at", sa.String, nullable=False),
    )
    op.create_index("idx_sessions_user", "sessions", ["user_id"])
    op.create_index("idx_sessions_expiration", "sessions", ["expires_at"])

    # --- settings ---
    op.create_table(
        "settings",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("user_id", sa.String(36), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("openai_api_key_encrypted", sa.Text, nullable=False, server_default=""),
        sa.Column("default_model", sa.String(100), nullable=False, server_default="gpt-5-mini"),
        sa.Column("created_at", sa.String, nullable=False),
        sa.Column("updated_at", sa.String, nullable=False),
    )

    # --- subjects ---
    op.create_table(
        "subjects",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("name", sa.String(255), nullable=False),
        sa.Column("is_custom", sa.Integer, nullable=False, server_default="0"),
        sa.Column("created_at", sa.String, nullable=False),
    )

    # --- source_files ---
    op.create_table(
        "source_files",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("subject_id", sa.String(36), sa.ForeignKey("subjects.id", ondelete="CASCADE"), nullable=False),
        sa.Column("filename", sa.Text, nullable=False),
        sa.Column("original_path", sa.Text, nullable=False),
        sa.Column("file_type", sa.String(20), nullable=False),
        sa.Column("file_size", sa.Integer, nullable=False),
        sa.Column("extracted_text", sa.Text, nullable=True),
        sa.Column("summary", sa.Text, nullable=True),
        sa.Column("page_count", sa.Integer, nullable=True),
        sa.Column("created_at", sa.String, nullable=False),
        sa.Column("deleted_at", sa.String, nullable=True),
    )
    op.create_index("idx_source_files_subject", "source_files", ["subject_id"])
    op.create_index("idx_source_files_created_at", "source_files", ["created_at"])

    # --- generations ---
    op.create_table(
        "generations",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("subject_id", sa.String(36), sa.ForeignKey("subjects.id"), nullable=False),
        sa.Column("content_type", sa.String(50), nullable=False),
        sa.Column("education_level", sa.String(20), nullable=False),
        sa.Column("class_level", sa.Integer, nullable=False),
        sa.Column("language_level", sa.String(10), nullable=True),
        sa.Column("topic", sa.Text, nullable=False),
        sa.Column("instructions", sa.Text, nullable=True),
        sa.Column("difficulty", sa.Integer, nullable=False),
        sa.Column("total_questions", sa.Integer, nullable=False),
        sa.Column("open_questions", sa.Integer, nullable=False),
        sa.Column("closed_questions", sa.Integer, nullable=False),
        sa.Column("variants_count", sa.Integer, nullable=False, server_default="1"),
        sa.Column("created_at", sa.String, nullable=False),
        sa.Column("updated_at", sa.String, nullable=False),
        sa.Column("status", sa.String(20), nullable=False, server_default="draft"),
        sa.Column("error_message", sa.Text, nullable=True),
    )
    op.create_index("idx_generations_subject", "generations", ["subject_id"])
    op.create_index("idx_generations_created_at", "generations", ["created_at"])
    op.create_index("idx_generations_status", "generations", ["status"])

    # --- generation_source_files ---
    op.create_table(
        "generation_source_files",
        sa.Column("generation_id", sa.String(36), sa.ForeignKey("generations.id", ondelete="CASCADE"), primary_key=True),
        sa.Column("source_file_id", sa.String(36), sa.ForeignKey("source_files.id", ondelete="CASCADE"), primary_key=True),
    )

    # --- prototypes ---
    op.create_table(
        "prototypes",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("generation_id", sa.String(36), sa.ForeignKey("generations.id", ondelete="CASCADE"), nullable=False, unique=True),
        sa.Column("original_content", sa.Text, nullable=False),
        sa.Column("edited_content", sa.Text, nullable=True),
        sa.Column("answer_key", sa.Text, nullable=False),
        sa.Column("created_at", sa.String, nullable=False),
        sa.Column("updated_at", sa.String, nullable=False),
    )

    # --- documents ---
    op.create_table(
        "documents",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("generation_id", sa.String(36), sa.ForeignKey("generations.id", ondelete="CASCADE"), nullable=False),
        sa.Column("filename", sa.Text, nullable=False),
        sa.Column("file_path", sa.Text, nullable=False),
        sa.Column("variants_count", sa.Integer, nullable=False),
        sa.Column("created_at", sa.String, nullable=False),
        sa.Column("deleted_at", sa.String, nullable=True),
    )
    op.create_index("idx_documents_generation", "documents", ["generation_id"])
    op.create_index("idx_documents_created_at", "documents", ["created_at"])

    # --- ai_requests ---
    op.create_table(
        "ai_requests",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("generation_id", sa.String(36), sa.ForeignKey("generations.id", ondelete="SET NULL"), nullable=True),
        sa.Column("model_name", sa.String(100), nullable=False),
        sa.Column("prompt_tokens", sa.Integer, nullable=True),
        sa.Column("completion_tokens", sa.Integer, nullable=True),
        sa.Column("total_tokens", sa.Integer, nullable=True),
        sa.Column("request_type", sa.String(50), nullable=False),
        sa.Column("request_payload", sa.Text, nullable=True),
        sa.Column("response_payload", sa.Text, nullable=True),
        sa.Column("created_at", sa.String, nullable=False),
    )
    op.create_index("idx_ai_requests_generation", "ai_requests", ["generation_id"])
    op.create_index("idx_ai_requests_created_at", "ai_requests", ["created_at"])

    # --- backups ---
    op.create_table(
        "backups",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("backup_path", sa.Text, nullable=False),
        sa.Column("size_bytes", sa.Integer, nullable=False),
        sa.Column("created_at", sa.String, nullable=False),
        sa.Column("expires_at", sa.String, nullable=False),
    )
    op.create_index("idx_backups_expiration", "backups", ["expires_at"])

    # --- diagnostic_logs ---
    op.create_table(
        "diagnostic_logs",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("level", sa.String(20), nullable=False),
        sa.Column("message", sa.Text, nullable=False),
        sa.Column("metadata_json", sa.Text, nullable=True),
        sa.Column("created_at", sa.String, nullable=False),
    )
    op.create_index("idx_diagnostic_logs_created_at", "diagnostic_logs", ["created_at"])


def downgrade() -> None:
    op.drop_table("diagnostic_logs")
    op.drop_table("backups")
    op.drop_table("ai_requests")
    op.drop_table("documents")
    op.drop_table("prototypes")
    op.drop_table("generation_source_files")
    op.drop_table("generations")
    op.drop_table("source_files")
    op.drop_table("subjects")
    op.drop_table("settings")
    op.drop_table("sessions")
    op.drop_table("users")
