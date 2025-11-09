"""add_indexes_for_audit_metrics

Revision ID: fb6666668b4b
Revises: 5b82b01ebf96
Create Date: 2025-11-09 07:45:31.447812+00:00

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'fb6666668b4b'
down_revision = '5b82b01ebf96'
branch_labels = None
depends_on = None


def upgrade() -> None:
    """Add indexes for audit metrics performance."""
    # Index on status_code for status breakdown queries
    op.create_index(
        op.f('ix_api_audit_logs_status_code'),
        'api_audit_logs',
        ['status_code'],
        unique=False
    )
    # Composite index for org-scoped time-series queries
    op.create_index(
        op.f('ix_api_audit_logs_org_created'),
        'api_audit_logs',
        ['organization_id', 'created_at'],
        unique=False
    )


def downgrade() -> None:
    """Remove indexes."""
    op.drop_index(op.f('ix_api_audit_logs_org_created'), table_name='api_audit_logs')
    op.drop_index(op.f('ix_api_audit_logs_status_code'), table_name='api_audit_logs')


