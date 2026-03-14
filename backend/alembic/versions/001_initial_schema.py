"""Initial schema (fully consolidated)

Revision ID: 001
Revises:
Create Date: 2026-03-14

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
        sa.Column("email", sa.String(255), nullable=False, unique=True),
        sa.Column("first_name", sa.String(255), nullable=True),
        sa.Column("last_name", sa.String(255), nullable=True),
        sa.Column("password_hash", sa.Text, nullable=False),
        sa.Column("is_active", sa.Boolean, nullable=False, server_default=sa.true()),
        sa.Column("is_superuser", sa.Boolean, nullable=False, server_default=sa.false()),
        sa.Column("created_at", sa.Text, nullable=False),
        sa.Column("updated_at", sa.Text, nullable=False),
        sa.Column("last_login_at", sa.Text, nullable=True),
        sa.Column("premium_level", sa.Integer, nullable=False, server_default="0"),
        sa.Column("api_quota", sa.Integer, nullable=False, server_default="1000"),
        sa.Column("api_quota_reset", sa.Text, nullable=True),
        sa.Column("is_email_verified", sa.Boolean, nullable=False, server_default=sa.false()),
        sa.Column("email_verification_token", sa.String(255), nullable=True),
        sa.Column("email_verification_token_expiry", sa.Text, nullable=True),
        sa.Column("reset_password_token", sa.String(255), nullable=True),
        sa.Column("reset_password_token_expiry", sa.Text, nullable=True),
        sa.Column("last_password_change", sa.Text, nullable=True),
        sa.Column("failed_login_attempts", sa.Integer, nullable=False, server_default="0"),
        sa.Column("default_model", sa.String(100), nullable=False, server_default="openai/gpt-5-mini"),
    )
    op.create_unique_constraint("uq_users_email", "users", ["email"])
    op.create_index("ix_users_email", "users", ["email"], unique=True)

    # --- verification_tokens ---
    op.create_table(
        "verification_tokens",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("user_id", sa.String(36), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("token", sa.String(255), nullable=False, unique=True),
        sa.Column("token_type", sa.String(50), nullable=False),
        sa.Column("payload_json", sa.Text, nullable=True),
        sa.Column("expires_at", sa.Text, nullable=False),
        sa.Column("is_used", sa.Boolean, nullable=False, server_default=sa.false()),
        sa.Column("created_at", sa.Text, nullable=False),
    )
    op.create_index("ix_verification_tokens_user_id", "verification_tokens", ["user_id"])
    op.create_index("ix_verification_tokens_token", "verification_tokens", ["token"], unique=True)

    # --- secret_keys ---
    op.create_table(
        "secret_keys",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("user_id", sa.String(36), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("platform", sa.String(50), nullable=False),
        sa.Column("key_name", sa.String(255), nullable=False),
        sa.Column("secret_key_hash", sa.Text, nullable=False),
        sa.Column("is_active", sa.Boolean, nullable=False, server_default=sa.true()),
        sa.Column("last_used_at", sa.Text, nullable=True),
        sa.Column("created_at", sa.Text, nullable=False),
    )
    op.create_index("ix_secret_keys_user_id", "secret_keys", ["user_id"])

    # --- user_ai_models ---
    op.create_table(
        "user_ai_models",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column(
            "user_id",
            sa.String(36),
            sa.ForeignKey("users.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("provider", sa.String(100), nullable=False),
        sa.Column("model_name", sa.String(255), nullable=False),
        sa.Column("description", sa.Text, nullable=True),
        sa.Column("price_description", sa.Text, nullable=True),
        sa.Column("is_available", sa.Boolean, nullable=False, server_default=sa.true()),
        sa.Column("created_at", sa.Text, nullable=False),
        sa.Column("changed_at", sa.Text, nullable=True),
        sa.Column("request_made", sa.Integer, nullable=False, server_default="0"),
    )
    op.create_index("ix_user_ai_models_user_id", "user_ai_models", ["user_id"])
    op.create_unique_constraint(
        "uq_user_ai_models_user_provider_model",
        "user_ai_models",
        ["user_id", "provider", "model_name"],
    )

    # --- subjects ---
    op.create_table(
        "subjects",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("user_id", sa.String(36), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=True),
        sa.Column("name", sa.String(255), nullable=False),
        sa.Column("is_custom", sa.Integer, nullable=False, server_default="0"),
        sa.Column("created_at", sa.Text, nullable=False),
    )
    op.create_index("ix_subjects_user_id", "subjects", ["user_id"])

    # --- file_content_cache ---
    op.create_table(
        "file_content_cache",
        sa.Column("file_hash", sa.String(64), primary_key=True),
        sa.Column("file_type", sa.String(20), nullable=False),
        sa.Column("extracted_text", sa.Text, nullable=True),
        sa.Column("summary", sa.Text, nullable=True),
        sa.Column("page_count", sa.Integer, nullable=True),
        sa.Column("created_at", sa.Text, nullable=False),
    )

    # --- source_files ---
    op.create_table(
        "source_files",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("user_id", sa.String(36), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("subject_id", sa.String(36), sa.ForeignKey("subjects.id", ondelete="CASCADE"), nullable=False),
        sa.Column("filename", sa.Text, nullable=False),
        sa.Column("original_path", sa.Text, nullable=False),
        sa.Column("file_type", sa.String(20), nullable=False),
        sa.Column("file_size", sa.Integer, nullable=False),
        sa.Column("file_hash", sa.String(64), nullable=True),
        sa.Column("extracted_text", sa.Text, nullable=True),
        sa.Column("summary", sa.Text, nullable=True),
        sa.Column("page_count", sa.Integer, nullable=True),
        sa.Column("created_at", sa.Text, nullable=False),
        sa.Column("deleted_at", sa.Text, nullable=True),
    )
    op.create_index("ix_source_files_user_id", "source_files", ["user_id"])
    op.create_index("ix_source_files_subject", "source_files", ["subject_id"])
    op.create_index("ix_source_files_created_at", "source_files", ["created_at"])
    op.create_index("ix_source_files_file_hash", "source_files", ["file_hash"])

    # --- generations ---
    op.create_table(
        "generations",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("user_id", sa.String(36), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("subject_id", sa.String(36), sa.ForeignKey("subjects.id", ondelete="CASCADE"), nullable=False),
        sa.Column("content_type", sa.String(50), nullable=False),
        sa.Column("education_level", sa.String(255), nullable=False),
        sa.Column("class_level", sa.String(100), nullable=False),
        sa.Column("language_level", sa.String(10), nullable=True),
        sa.Column("topic", sa.Text, nullable=False),
        sa.Column("instructions", sa.Text, nullable=True),
        sa.Column("difficulty", sa.Integer, nullable=False),
        sa.Column("total_questions", sa.Integer, nullable=False),
        sa.Column("open_questions", sa.Integer, nullable=False),
        sa.Column("closed_questions", sa.Integer, nullable=False),
        sa.Column("variants_count", sa.Integer, nullable=False, server_default="1"),
        sa.Column("task_types", sa.Text, nullable=True),
        sa.Column("created_at", sa.Text, nullable=False),
        sa.Column("updated_at", sa.Text, nullable=False),
        sa.Column("status", sa.String(20), nullable=False, server_default="draft"),
        sa.Column("error_message", sa.Text, nullable=True),
        sa.Column("curriculum_compliance_enabled", sa.Boolean, nullable=False, server_default="false"),
    )
    op.create_index("ix_generations_user_id", "generations", ["user_id"])
    op.create_index("ix_generations_subject", "generations", ["subject_id"])
    op.create_index("ix_generations_created_at", "generations", ["created_at"])
    op.create_index("ix_generations_status", "generations", ["status"])

    # --- generation_source_files ---
    op.create_table(
        "generation_source_files",
        sa.Column("generation_id", sa.String(36), sa.ForeignKey("generations.id", ondelete="CASCADE"), nullable=False),
        sa.Column("source_file_id", sa.String(36), sa.ForeignKey("source_files.id", ondelete="CASCADE"), nullable=False),
        sa.PrimaryKeyConstraint("generation_id", "source_file_id"),
    )

    # --- prototypes ---
    op.create_table(
        "prototypes",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("user_id", sa.String(36), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("generation_id", sa.String(36), sa.ForeignKey("generations.id", ondelete="CASCADE"), nullable=False, unique=True),
        sa.Column("original_content", sa.Text, nullable=False),
        sa.Column("edited_content", sa.Text, nullable=True),
        sa.Column("answer_key", sa.Text, nullable=False),
        sa.Column("raw_questions_json", sa.Text, nullable=True),
        sa.Column("comments_json", sa.Text, nullable=True),
        sa.Column("compliance_json", sa.Text, nullable=True),
        sa.Column("created_at", sa.Text, nullable=False),
        sa.Column("updated_at", sa.Text, nullable=False),
    )
    op.create_index("ix_prototypes_user_id", "prototypes", ["user_id"])

    # --- documents ---
    op.create_table(
        "documents",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("user_id", sa.String(36), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("generation_id", sa.String(36), sa.ForeignKey("generations.id", ondelete="CASCADE"), nullable=False),
        sa.Column("filename", sa.Text, nullable=False),
        sa.Column("file_path", sa.Text, nullable=False),
        sa.Column("variants_count", sa.Integer, nullable=False),
        sa.Column("created_at", sa.Text, nullable=False),
        sa.Column("deleted_at", sa.Text, nullable=True),
    )
    op.create_index("ix_documents_user_id", "documents", ["user_id"])
    op.create_index("ix_documents_generation", "documents", ["generation_id"])
    op.create_index("ix_documents_created_at", "documents", ["created_at"])

    # --- ai_requests ---
    op.create_table(
        "ai_requests",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("user_id", sa.String(36), sa.ForeignKey("users.id", ondelete="SET NULL"), nullable=True),
        sa.Column("generation_id", sa.String(36), sa.ForeignKey("generations.id", ondelete="SET NULL"), nullable=True),
        sa.Column("model_name", sa.String(100), nullable=False),
        sa.Column("prompt_tokens", sa.Integer, nullable=True),
        sa.Column("completion_tokens", sa.Integer, nullable=True),
        sa.Column("total_tokens", sa.Integer, nullable=True),
        sa.Column("request_type", sa.String(50), nullable=False),
        sa.Column("request_payload", sa.Text, nullable=True),
        sa.Column("response_payload", sa.Text, nullable=True),
        sa.Column("created_at", sa.Text, nullable=False),
    )
    op.create_index("ix_ai_requests_user_id", "ai_requests", ["user_id"])
    op.create_index("ix_ai_requests_generation", "ai_requests", ["generation_id"])
    op.create_index("ix_ai_requests_created_at", "ai_requests", ["created_at"])

    # --- backups ---
    op.create_table(
        "backups",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("backup_path", sa.Text, nullable=False),
        sa.Column("size_bytes", sa.Integer, nullable=False),
        sa.Column("created_at", sa.Text, nullable=False),
        sa.Column("expires_at", sa.Text, nullable=False),
    )
    op.create_index("ix_backups_expiration", "backups", ["expires_at"])

    # --- diagnostic_logs ---
    op.create_table(
        "diagnostic_logs",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("level", sa.String(20), nullable=False),
        sa.Column("message", sa.Text, nullable=False),
        sa.Column("metadata_json", sa.Text, nullable=True),
        sa.Column("created_at", sa.Text, nullable=False),
    )
    op.create_index("ix_diagnostic_logs_created_at", "diagnostic_logs", ["created_at"])

    # --- curriculum ---
    op.execute("CREATE EXTENSION IF NOT EXISTS vector")

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

    op.execute("ALTER TABLE curriculum_chunks ADD COLUMN embedding vector(1536)")

    op.execute(
        """
        DO $$
        BEGIN
            EXECUTE 'CREATE INDEX ix_curriculum_chunks_embedding ON curriculum_chunks '
                 || 'USING hnsw (embedding vector_cosine_ops) '
                 || 'WITH (m = 16, ef_construction = 64)';
        EXCEPTION
            WHEN program_limit_exceeded THEN
                RAISE NOTICE 'Skipping ix_curriculum_chunks_embedding: HNSW supports max 2000 dims for vector.';
        END
        $$;
        """
    )


def downgrade() -> None:
    op.execute("DROP INDEX IF EXISTS ix_curriculum_chunks_embedding")
    op.drop_table("curriculum_chunks")
    op.drop_table("curriculum_documents")
    op.execute("DROP EXTENSION IF EXISTS vector")
    op.drop_table("diagnostic_logs")
    op.drop_table("backups")
    op.drop_table("ai_requests")
    op.drop_table("documents")
    op.drop_table("prototypes")
    op.drop_table("generation_source_files")
    op.drop_table("generations")
    op.drop_table("source_files")
    op.drop_table("file_content_cache")
    op.drop_table("subjects")
    op.drop_table("user_ai_models")
    op.drop_table("secret_keys")
    op.drop_table("verification_tokens")
    op.drop_table("users")
