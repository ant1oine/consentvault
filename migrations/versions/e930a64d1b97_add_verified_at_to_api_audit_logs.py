"""Add verified_at and verifier_api_key_id to api_audit_logs

Revision ID: 005_add_verified_at
Revises: 004_add_api_audit_logs
Create Date: 2024-01-05 00:00:00.000000

"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = '005_add_verified_at'
down_revision = '004_add_api_audit_logs'
branch_labels = None
depends_on = None


def upgrade() -> None:
    """Add verified_at and verifier_api_key_id columns for tamper-evident verification."""
    op.add_column(
        'api_audit_logs',
        sa.Column('verified_at', sa.DateTime(timezone=True), nullable=True),
    )
    op.add_column(
        'api_audit_logs',
        sa.Column('verifier_api_key_id', sa.Integer(), nullable=True),
    )
    # Add foreign key constraint for verifier_api_key_id
    op.create_foreign_key(
        'fk_api_audit_logs_verifier_api_key_id',
        'api_audit_logs',
        'api_keys',
        ['verifier_api_key_id'],
        ['id'],
    )


def downgrade() -> None:
    """Remove verified_at and verifier_api_key_id columns."""
    op.drop_constraint('fk_api_audit_logs_verifier_api_key_id', 'api_audit_logs', type_='foreignkey')
    op.drop_column('api_audit_logs', 'verifier_api_key_id')
    op.drop_column('api_audit_logs', 'verified_at')
