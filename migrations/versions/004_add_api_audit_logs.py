"""Add api_audit_logs table

Revision ID: 004_add_api_audit_logs
Revises: 003_add_users_and_userrole_enum
Create Date: 2024-01-04 00:00:00.000000

"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = '004_add_api_audit_logs'
down_revision = '003_add_users_and_userrole_enum'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        'api_audit_logs',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('organization_id', sa.Integer(), nullable=False),
        sa.Column('api_key_id', sa.Integer(), nullable=False),
        sa.Column('method', sa.String(length=10), nullable=False),
        sa.Column('path', sa.String(length=255), nullable=False),
        sa.Column('status_code', sa.Integer(), nullable=False),
        sa.Column('ip_address', sa.String(length=45), nullable=True),
        sa.Column('request_hash', sa.String(length=64), nullable=True),
        sa.Column('response_hash', sa.String(length=64), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.ForeignKeyConstraint(['organization_id'], ['organizations.id'], ),
        sa.ForeignKeyConstraint(['api_key_id'], ['api_keys.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_api_audit_logs_id'), 'api_audit_logs', ['id'], unique=False)
    op.create_index(op.f('ix_api_audit_logs_organization_id'), 'api_audit_logs', ['organization_id'], unique=False)
    op.create_index(op.f('ix_api_audit_logs_api_key_id'), 'api_audit_logs', ['api_key_id'], unique=False)
    op.create_index(op.f('ix_api_audit_logs_created_at'), 'api_audit_logs', ['created_at'], unique=False)


def downgrade() -> None:
    op.drop_index(op.f('ix_api_audit_logs_created_at'), table_name='api_audit_logs')
    op.drop_index(op.f('ix_api_audit_logs_api_key_id'), table_name='api_audit_logs')
    op.drop_index(op.f('ix_api_audit_logs_organization_id'), table_name='api_audit_logs')
    op.drop_index(op.f('ix_api_audit_logs_id'), table_name='api_audit_logs')
    op.drop_table('api_audit_logs')

