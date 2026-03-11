"""Add user_ai_models table

Revision ID: 002
Revises: 001
Create Date: 2026-03-11

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "002"
down_revision: Union[str, None] = "001"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
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
        sa.Column(
            "is_available", sa.Boolean, nullable=False, server_default=sa.true()
        ),
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


def downgrade() -> None:
    op.drop_table("user_ai_models")
