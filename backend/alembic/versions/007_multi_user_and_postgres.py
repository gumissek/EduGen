"""Multi-user and PostgreSQL migration.

Revision ID: 007
Revises: 006_class_level_to_string
Create Date: 2026-03-10

This migration:
- Expands the users table for multi-user support (email, names, roles, etc.)
- Creates the secret_keys table
- Adds user_id FK to subjects, source_files, generations, prototypes, documents, ai_requests
- Drops the sessions table (JWT replaces server-side sessions)
"""

from alembic import op
import sqlalchemy as sa

# revision identifiers
revision = "007"
down_revision = "006"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # --- Users table changes ---
    op.add_column("users", sa.Column("email", sa.String(255), nullable=True))
    op.add_column("users", sa.Column("first_name", sa.String(255), nullable=True))
    op.add_column("users", sa.Column("last_name", sa.String(255), nullable=True))
    op.add_column("users", sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.text("true")))
    op.add_column("users", sa.Column("is_superuser", sa.Boolean(), nullable=False, server_default=sa.text("false")))
    op.add_column("users", sa.Column("last_login_at", sa.String(), nullable=True))
    op.add_column("users", sa.Column("premium_level", sa.Integer(), nullable=False, server_default=sa.text("0")))
    op.add_column("users", sa.Column("api_quota", sa.Integer(), nullable=False, server_default=sa.text("1000")))
    op.add_column("users", sa.Column("api_quota_reset", sa.String(), nullable=True))
    op.add_column("users", sa.Column("is_email_verified", sa.Boolean(), nullable=False, server_default=sa.text("false")))
    op.add_column("users", sa.Column("email_verification_token", sa.String(255), nullable=True))
    op.add_column("users", sa.Column("email_verification_token_expiry", sa.String(), nullable=True))
    op.add_column("users", sa.Column("reset_password_token", sa.String(255), nullable=True))
    op.add_column("users", sa.Column("reset_password_token_expiry", sa.String(), nullable=True))
    op.add_column("users", sa.Column("last_password_change", sa.String(), nullable=True))
    op.add_column("users", sa.Column("failed_login_attempts", sa.Integer(), nullable=False, server_default=sa.text("0")))

    # Make email unique and indexed (after populating existing rows)
    # For existing users, set email = id + '@legacy.local' as placeholder
    op.execute("UPDATE users SET email = id || '@legacy.local' WHERE email IS NULL")
    op.alter_column("users", "email", nullable=False)
    op.create_index("ix_users_email", "users", ["email"], unique=True)

    # Drop must_change_password if it exists
    try:
        op.drop_column("users", "must_change_password")
    except Exception:
        pass  # Column might not exist

    # --- Create secret_keys table ---
    op.create_table(
        "secret_keys",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("user_id", sa.String(36), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("platform", sa.String(50), nullable=False),
        sa.Column("key_name", sa.String(255), nullable=False),
        sa.Column("secret_key_hash", sa.Text(), nullable=False),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.text("true")),
        sa.Column("last_used_at", sa.String(), nullable=True),
        sa.Column("created_at", sa.String(), nullable=False),
    )
    op.create_index("ix_secret_keys_user_id", "secret_keys", ["user_id"])

    # --- Add user_id FK to data tables ---
    # Subjects (nullable — predefined subjects have no owner)
    op.add_column("subjects", sa.Column("user_id", sa.String(36), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=True))
    op.create_index("ix_subjects_user_id", "subjects", ["user_id"])

    # Source files
    op.add_column("source_files", sa.Column("user_id", sa.String(36), nullable=True))
    op.create_index("ix_source_files_user_id", "source_files", ["user_id"])

    # Generations
    op.add_column("generations", sa.Column("user_id", sa.String(36), nullable=True))
    op.create_index("ix_generations_user_id", "generations", ["user_id"])

    # Prototypes
    op.add_column("prototypes", sa.Column("user_id", sa.String(36), nullable=True))
    op.create_index("ix_prototypes_user_id", "prototypes", ["user_id"])

    # Documents
    op.add_column("documents", sa.Column("user_id", sa.String(36), nullable=True))
    op.create_index("ix_documents_user_id", "documents", ["user_id"])

    # AI requests
    op.add_column("ai_requests", sa.Column("user_id", sa.String(36), nullable=True))
    op.create_index("ix_ai_requests_user_id", "ai_requests", ["user_id"])

    # Assign existing data to the first user (if any exist)
    op.execute("""
        UPDATE source_files SET user_id = (SELECT id FROM users LIMIT 1) WHERE user_id IS NULL
    """)
    op.execute("""
        UPDATE generations SET user_id = (SELECT id FROM users LIMIT 1) WHERE user_id IS NULL
    """)
    op.execute("""
        UPDATE prototypes SET user_id = (SELECT id FROM users LIMIT 1) WHERE user_id IS NULL
    """)
    op.execute("""
        UPDATE documents SET user_id = (SELECT id FROM users LIMIT 1) WHERE user_id IS NULL
    """)

    # Add FKs after data migration (PostgreSQL requires existing data to match)
    op.create_foreign_key("fk_source_files_user_id", "source_files", "users", ["user_id"], ["id"], ondelete="CASCADE")
    op.create_foreign_key("fk_generations_user_id", "generations", "users", ["user_id"], ["id"], ondelete="CASCADE")
    op.create_foreign_key("fk_prototypes_user_id", "prototypes", "users", ["user_id"], ["id"], ondelete="CASCADE")
    op.create_foreign_key("fk_documents_user_id", "documents", "users", ["user_id"], ["id"], ondelete="CASCADE")
    op.create_foreign_key("fk_ai_requests_user_id", "ai_requests", "users", ["user_id"], ["id"], ondelete="SET NULL")

    # --- Drop sessions table (JWT replaces sessions) ---
    op.drop_table("sessions")


def downgrade() -> None:
    # Recreate sessions table
    op.create_table(
        "sessions",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("user_id", sa.String(36), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("token", sa.String(255), nullable=False, unique=True, index=True),
        sa.Column("created_at", sa.String(), nullable=False),
        sa.Column("expires_at", sa.String(), nullable=False),
        sa.Column("last_activity", sa.String(), nullable=True),
    )

    # Drop FKs and user_id columns from data tables
    op.drop_constraint("fk_ai_requests_user_id", "ai_requests", type_="foreignkey")
    op.drop_constraint("fk_documents_user_id", "documents", type_="foreignkey")
    op.drop_constraint("fk_prototypes_user_id", "prototypes", type_="foreignkey")
    op.drop_constraint("fk_generations_user_id", "generations", type_="foreignkey")
    op.drop_constraint("fk_source_files_user_id", "source_files", type_="foreignkey")

    op.drop_index("ix_ai_requests_user_id", "ai_requests")
    op.drop_column("ai_requests", "user_id")
    op.drop_index("ix_documents_user_id", "documents")
    op.drop_column("documents", "user_id")
    op.drop_index("ix_prototypes_user_id", "prototypes")
    op.drop_column("prototypes", "user_id")
    op.drop_index("ix_generations_user_id", "generations")
    op.drop_column("generations", "user_id")
    op.drop_index("ix_source_files_user_id", "source_files")
    op.drop_column("source_files", "user_id")
    op.drop_index("ix_subjects_user_id", "subjects")
    op.drop_column("subjects", "user_id")

    # Drop secret_keys table
    op.drop_index("ix_secret_keys_user_id", "secret_keys")
    op.drop_table("secret_keys")

    # Remove new user columns
    op.drop_index("ix_users_email", "users")
    op.drop_column("users", "failed_login_attempts")
    op.drop_column("users", "last_password_change")
    op.drop_column("users", "reset_password_token_expiry")
    op.drop_column("users", "reset_password_token")
    op.drop_column("users", "email_verification_token_expiry")
    op.drop_column("users", "email_verification_token")
    op.drop_column("users", "is_email_verified")
    op.drop_column("users", "api_quota_reset")
    op.drop_column("users", "api_quota")
    op.drop_column("users", "premium_level")
    op.drop_column("users", "last_login_at")
    op.drop_column("users", "is_superuser")
    op.drop_column("users", "is_active")
    op.drop_column("users", "last_name")
    op.drop_column("users", "first_name")
    op.drop_column("users", "email")

    # Re-add must_change_password
    op.add_column("users", sa.Column("must_change_password", sa.Boolean(), nullable=False, server_default=sa.text("true")))
