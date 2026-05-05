"""add_text_permissions_table

Revision ID: e3f4a5b6c7d8
Revises: b2c3d4e5f6a7
Create Date: 2026-05-05

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "e3f4a5b6c7d8"
down_revision: Union[str, None] = "b2c3d4e5f6a7"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "text_permissions",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("text_id", sa.Integer(), nullable=False),
        sa.Column("owner_user_id", sa.Integer(), nullable=False),
        sa.Column("grantee_user_id", sa.Integer(), nullable=False),
        sa.Column("permission", sa.String(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=True),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(["grantee_user_id"], ["users.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["owner_user_id"], ["users.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["text_id"], ["texts.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("text_id", "grantee_user_id", name="uq_text_permissions_text_grantee"),
    )
    op.create_index(op.f("ix_text_permissions_id"), "text_permissions", ["id"], unique=False)
    op.create_index(op.f("ix_text_permissions_text_id"), "text_permissions", ["text_id"], unique=False)
    op.create_index(op.f("ix_text_permissions_owner_user_id"), "text_permissions", ["owner_user_id"], unique=False)
    op.create_index(op.f("ix_text_permissions_grantee_user_id"), "text_permissions", ["grantee_user_id"], unique=False)


def downgrade() -> None:
    op.drop_index(op.f("ix_text_permissions_grantee_user_id"), table_name="text_permissions")
    op.drop_index(op.f("ix_text_permissions_owner_user_id"), table_name="text_permissions")
    op.drop_index(op.f("ix_text_permissions_text_id"), table_name="text_permissions")
    op.drop_index(op.f("ix_text_permissions_id"), table_name="text_permissions")
    op.drop_table("text_permissions")
