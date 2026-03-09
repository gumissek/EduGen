"""Change class_level column from Integer to String

Stores the raw value exactly as typed by the user (e.g. "Klasa 4", "Semestr 2",
"Rok 1") instead of a plain integer, removing the need for any unit-mapping logic.

Existing integer rows are migrated to "Klasa <n>" (preserving readability).

Revision ID: 006
Revises: 005
Create Date: 2026-03-09

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy import text

revision: str = "006"
down_revision: Union[str, None] = "005"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 1. Add a temporary helper column
    with op.batch_alter_table("generations") as batch_op:
        batch_op.add_column(sa.Column("class_level_str", sa.String(100), nullable=True))

    # 2. Copy existing integer values converted to "Klasa <n>"
    conn = op.get_bind()
    conn.execute(text(
        "UPDATE generations SET class_level_str = 'Klasa ' || CAST(class_level AS TEXT)"
    ))

    # 3. Swap columns: drop old Integer column, rename new String column
    with op.batch_alter_table("generations") as batch_op:
        batch_op.drop_column("class_level")
        batch_op.alter_column(
            "class_level_str",
            new_column_name="class_level",
            nullable=False,
            existing_type=sa.String(100),
        )


def downgrade() -> None:
    # 1. Add temporary integer column
    with op.batch_alter_table("generations") as batch_op:
        batch_op.add_column(sa.Column("class_level_int", sa.Integer(), nullable=True))

    # 2. Try to parse the leading integer from the stored string ("Klasa 4" → 4)
    conn = op.get_bind()
    conn.execute(text(
        "UPDATE generations SET class_level_int = CAST("
        "  TRIM(REPLACE(REPLACE(REPLACE(class_level, 'Klasa ', ''), 'Semestr ', ''), 'Rok ', ''))"
        "  AS INTEGER)"
    ))

    # 3. Swap columns back
    with op.batch_alter_table("generations") as batch_op:
        batch_op.drop_column("class_level")
        batch_op.alter_column(
            "class_level_int",
            new_column_name="class_level",
            nullable=False,
            existing_type=sa.Integer(),
        )
