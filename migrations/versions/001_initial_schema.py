"""Initial schema

Revision ID: 001_initial
Revises: 
Create Date: 2024-01-01 00:00:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = '001_initial'
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Organizations
    op.create_table(
        'organizations',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('name', sa.String(length=255), nullable=False),
        sa.Column('data_region', sa.Enum('KSA', 'UAE', name='dataregion'), nullable=False),
        sa.Column('status', sa.Enum('ACTIVE', 'SUSPENDED', 'DELETED', name='organizationstatus'), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_organizations_id'), 'organizations', ['id'], unique=False)
    op.create_index(op.f('ix_organizations_name'), 'organizations', ['name'], unique=False)

    # API Keys
    op.create_table(
        'api_keys',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('organization_id', sa.Integer(), nullable=False),
        sa.Column('name', sa.String(length=255), nullable=False),
        sa.Column('hashed_key', sa.String(length=255), nullable=False),
        sa.Column('hmac_secret', sa.String(length=512), nullable=True),
        sa.Column('last_used_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('active', sa.Boolean(), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.ForeignKeyConstraint(['organization_id'], ['organizations.id'], ),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('hashed_key')
    )
    op.create_index(op.f('ix_api_keys_id'), 'api_keys', ['id'], unique=False)
    op.create_index(op.f('ix_api_keys_organization_id'), 'api_keys', ['organization_id'], unique=False)
    op.create_index(op.f('ix_api_keys_active'), 'api_keys', ['active'], unique=False)

    # Purposes
    op.create_table(
        'purposes',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('organization_id', sa.Integer(), nullable=False),
        sa.Column('code', sa.String(length=100), nullable=False),
        sa.Column('description', sa.String(length=500), nullable=True),
        sa.Column('active', sa.Boolean(), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.ForeignKeyConstraint(['organization_id'], ['organizations.id'], ),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('organization_id', 'code')
    )
    op.create_index(op.f('ix_purposes_id'), 'purposes', ['id'], unique=False)
    op.create_index(op.f('ix_purposes_organization_id'), 'purposes', ['organization_id'], unique=False)
    op.create_index(op.f('ix_purposes_code'), 'purposes', ['code'], unique=False)
    op.create_index(op.f('ix_purposes_active'), 'purposes', ['active'], unique=False)

    # Systems
    op.create_table(
        'systems',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('organization_id', sa.Integer(), nullable=False),
        sa.Column('code', sa.String(length=100), nullable=False),
        sa.Column('description', sa.String(length=500), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.ForeignKeyConstraint(['organization_id'], ['organizations.id'], ),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('organization_id', 'code')
    )
    op.create_index(op.f('ix_systems_id'), 'systems', ['id'], unique=False)
    op.create_index(op.f('ix_systems_organization_id'), 'systems', ['organization_id'], unique=False)
    op.create_index(op.f('ix_systems_code'), 'systems', ['code'], unique=False)

    # Consent Aggregates
    op.create_table(
        'consent_aggregates',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('organization_id', sa.Integer(), nullable=False),
        sa.Column('external_user_id', sa.String(length=255), nullable=False),
        sa.Column('purpose_id', sa.Integer(), nullable=False),
        sa.Column('status', sa.Enum('GRANTED', 'WITHDRAWN', name='consentstatus'), nullable=False),
        sa.Column('last_event_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('source_system_id', sa.Integer(), nullable=True),
        sa.Column('evidence_ref', sa.String(length=500), nullable=True),
        sa.Column('encrypted_fields', postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.ForeignKeyConstraint(['organization_id'], ['organizations.id'], ),
        sa.ForeignKeyConstraint(['purpose_id'], ['purposes.id'], ),
        sa.ForeignKeyConstraint(['source_system_id'], ['systems.id'], ),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('organization_id', 'external_user_id', 'purpose_id')
    )
    op.create_index(op.f('ix_consent_aggregates_id'), 'consent_aggregates', ['id'], unique=False)
    op.create_index(op.f('ix_consent_aggregates_organization_id'), 'consent_aggregates', ['organization_id'], unique=False)
    op.create_index(op.f('ix_consent_aggregates_external_user_id'), 'consent_aggregates', ['external_user_id'], unique=False)
    op.create_index(op.f('ix_consent_aggregates_purpose_id'), 'consent_aggregates', ['purpose_id'], unique=False)
    op.create_index(op.f('ix_consent_aggregates_status'), 'consent_aggregates', ['status'], unique=False)

    # Consent Events
    op.create_table(
        'consent_events',
        sa.Column('id', sa.String(length=26), nullable=False),
        sa.Column('organization_id', sa.Integer(), nullable=False),
        sa.Column('aggregate_id', sa.Integer(), nullable=False),
        sa.Column('purpose_id', sa.Integer(), nullable=False),
        sa.Column('status', sa.Enum('GRANTED', 'WITHDRAWN', name='consentstatus'), nullable=False),
        sa.Column('method', sa.Enum('CHECKBOX', 'TOS', 'CONTRACT', 'OTHER', name='consentmethod'), nullable=False),
        sa.Column('source', sa.String(length=255), nullable=True),
        sa.Column('ip_hash', sa.String(length=64), nullable=True),
        sa.Column('user_agent_hash', sa.String(length=64), nullable=True),
        sa.Column('timestamp', sa.DateTime(timezone=True), nullable=False),
        sa.Column('evidence_ref', sa.String(length=500), nullable=True),
        sa.Column('prev_hash', sa.String(length=64), nullable=False),
        sa.Column('event_hash', sa.String(length=64), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.ForeignKeyConstraint(['organization_id'], ['organizations.id'], ),
        sa.ForeignKeyConstraint(['aggregate_id'], ['consent_aggregates.id'], ),
        sa.ForeignKeyConstraint(['purpose_id'], ['purposes.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_consent_events_id'), 'consent_events', ['id'], unique=False)
    op.create_index(op.f('ix_consent_events_organization_id'), 'consent_events', ['organization_id'], unique=False)
    op.create_index(op.f('ix_consent_events_aggregate_id'), 'consent_events', ['aggregate_id'], unique=False)
    op.create_index(op.f('ix_consent_events_purpose_id'), 'consent_events', ['purpose_id'], unique=False)
    op.create_index(op.f('ix_consent_events_timestamp'), 'consent_events', ['timestamp'], unique=False)

    # Data Rights Requests
    op.create_table(
        'data_right_requests',
        sa.Column('id', sa.String(length=26), nullable=False),
        sa.Column('organization_id', sa.Integer(), nullable=False),
        sa.Column('external_user_id', sa.String(length=255), nullable=False),
        sa.Column('right', sa.Enum('ACCESS', 'ERASURE', 'PORTABILITY', name='dataright'), nullable=False),
        sa.Column('status', sa.Enum('OPEN', 'IN_PROGRESS', 'COMPLETED', 'REJECTED', name='requeststatus'), nullable=False),
        sa.Column('opened_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('closed_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('reason', sa.Text(), nullable=True),
        sa.Column('evidence_ref', sa.String(length=500), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.ForeignKeyConstraint(['organization_id'], ['organizations.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_data_right_requests_id'), 'data_right_requests', ['id'], unique=False)
    op.create_index(op.f('ix_data_right_requests_organization_id'), 'data_right_requests', ['organization_id'], unique=False)
    op.create_index(op.f('ix_data_right_requests_external_user_id'), 'data_right_requests', ['external_user_id'], unique=False)
    op.create_index(op.f('ix_data_right_requests_right'), 'data_right_requests', ['right'], unique=False)
    op.create_index(op.f('ix_data_right_requests_status'), 'data_right_requests', ['status'], unique=False)

    # Policies
    op.create_table(
        'policies',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('organization_id', sa.Integer(), nullable=False),
        sa.Column('purpose_id', sa.Integer(), nullable=False),
        sa.Column('retention_days', sa.Integer(), nullable=False),
        sa.Column('active', sa.Boolean(), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.ForeignKeyConstraint(['organization_id'], ['organizations.id'], ),
        sa.ForeignKeyConstraint(['purpose_id'], ['purposes.id'], ),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('organization_id', 'purpose_id')
    )
    op.create_index(op.f('ix_policies_id'), 'policies', ['id'], unique=False)
    op.create_index(op.f('ix_policies_organization_id'), 'policies', ['organization_id'], unique=False)
    op.create_index(op.f('ix_policies_purpose_id'), 'policies', ['purpose_id'], unique=False)
    op.create_index(op.f('ix_policies_active'), 'policies', ['active'], unique=False)

    # Webhook Endpoints
    op.create_table(
        'webhook_endpoints',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('organization_id', sa.Integer(), nullable=False),
        sa.Column('url', sa.String(length=500), nullable=False),
        sa.Column('secret', sa.String(length=512), nullable=False),
        sa.Column('active', sa.Boolean(), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.ForeignKeyConstraint(['organization_id'], ['organizations.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_webhook_endpoints_id'), 'webhook_endpoints', ['id'], unique=False)
    op.create_index(op.f('ix_webhook_endpoints_organization_id'), 'webhook_endpoints', ['organization_id'], unique=False)
    op.create_index(op.f('ix_webhook_endpoints_active'), 'webhook_endpoints', ['active'], unique=False)

    # Webhook Deliveries
    op.create_table(
        'webhook_deliveries',
        sa.Column('id', sa.String(length=26), nullable=False),
        sa.Column('organization_id', sa.Integer(), nullable=False),
        sa.Column('endpoint_id', sa.Integer(), nullable=False),
        sa.Column('event_type', sa.String(length=100), nullable=False),
        sa.Column('payload', postgresql.JSONB(astext_type=sa.Text()), nullable=False),
        sa.Column('status', sa.Enum('PENDING', 'SENT', 'FAILED', name='deliverystatus'), nullable=False),
        sa.Column('attempt_count', sa.Integer(), nullable=False),
        sa.Column('last_attempt_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('response_code', sa.Integer(), nullable=True),
        sa.Column('error_message', sa.String(length=1000), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.ForeignKeyConstraint(['organization_id'], ['organizations.id'], ),
        sa.ForeignKeyConstraint(['endpoint_id'], ['webhook_endpoints.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_webhook_deliveries_id'), 'webhook_deliveries', ['id'], unique=False)
    op.create_index(op.f('ix_webhook_deliveries_organization_id'), 'webhook_deliveries', ['organization_id'], unique=False)
    op.create_index(op.f('ix_webhook_deliveries_endpoint_id'), 'webhook_deliveries', ['endpoint_id'], unique=False)
    op.create_index(op.f('ix_webhook_deliveries_event_type'), 'webhook_deliveries', ['event_type'], unique=False)
    op.create_index(op.f('ix_webhook_deliveries_status'), 'webhook_deliveries', ['status'], unique=False)

    # Audit Logs
    op.create_table(
        'audit_logs',
        sa.Column('id', sa.String(length=26), nullable=False),
        sa.Column('organization_id', sa.Integer(), nullable=False),
        sa.Column('actor_api_key_id', sa.Integer(), nullable=True),
        sa.Column('event_type', sa.String(length=100), nullable=False),
        sa.Column('object_type', sa.String(length=100), nullable=False),
        sa.Column('object_id', sa.String(length=255), nullable=False),
        sa.Column('prev_hash', sa.String(length=64), nullable=False),
        sa.Column('entry_hash', sa.String(length=64), nullable=False),
        sa.Column('request_fingerprint', sa.String(length=64), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.ForeignKeyConstraint(['organization_id'], ['organizations.id'], ),
        sa.ForeignKeyConstraint(['actor_api_key_id'], ['api_keys.id'], ),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('entry_hash')
    )
    op.create_index(op.f('ix_audit_logs_id'), 'audit_logs', ['id'], unique=False)
    op.create_index(op.f('ix_audit_logs_organization_id'), 'audit_logs', ['organization_id'], unique=False)
    op.create_index(op.f('ix_audit_logs_actor_api_key_id'), 'audit_logs', ['actor_api_key_id'], unique=False)
    op.create_index(op.f('ix_audit_logs_event_type'), 'audit_logs', ['event_type'], unique=False)
    op.create_index(op.f('ix_audit_logs_object_type'), 'audit_logs', ['object_type'], unique=False)
    op.create_index(op.f('ix_audit_logs_object_id'), 'audit_logs', ['object_id'], unique=False)
    op.create_index(op.f('ix_audit_logs_entry_hash'), 'audit_logs', ['entry_hash'], unique=False)


def downgrade() -> None:
    op.drop_table('audit_logs')
    op.drop_table('webhook_deliveries')
    op.drop_table('webhook_endpoints')
    op.drop_table('policies')
    op.drop_table('data_right_requests')
    op.drop_table('consent_events')
    op.drop_table('consent_aggregates')
    op.drop_table('systems')
    op.drop_table('purposes')
    op.drop_table('api_keys')
    op.drop_table('organizations')
    op.execute('DROP TYPE IF EXISTS deliverystatus')
    op.execute('DROP TYPE IF EXISTS requeststatus')
    op.execute('DROP TYPE IF EXISTS dataright')
    op.execute('DROP TYPE IF EXISTS consentmethod')
    op.execute('DROP TYPE IF EXISTS consentstatus')
    op.execute('DROP TYPE IF EXISTS organizationstatus')
    op.execute('DROP TYPE IF EXISTS dataregion')


