"""merge heads

Revision ID: df60fc5da812
Revises: 74da484c515c, e3f4a5b6c7d8
Create Date: 2026-05-05 16:05:04.747067

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'df60fc5da812'
down_revision: Union[str, None] = ('74da484c515c', 'e3f4a5b6c7d8')
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    pass


def downgrade() -> None:
    pass
