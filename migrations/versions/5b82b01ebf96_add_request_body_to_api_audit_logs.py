"""add_request_body_to_api_audit_logs

Revision ID: 5b82b01ebf96
Revises: 005_add_verified_at
Create Date: 2025-11-09 07:31:27.347215+00:00

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '5b82b01ebf96'
down_revision = '005_add_verified_at'
branch_labels = None
depends_on = None


def upgrade() -> None:
    """Add request_body column to store UI event payloads and other request bodies."""
    op.add_column(
        'api_audit_logs',
        sa.Column('request_body', sa.Text(), nullable=True),
    )


def downgrade() -> None:
    """Remove request_body column."""
    op.drop_column('api_audit_logs', 'request_body')


