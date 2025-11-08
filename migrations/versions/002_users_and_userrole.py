"""Users table and userrole enum

Revision ID: 002_users
Revises: 698b90a4bf92
Create Date: 2024-01-02 00:00:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = '002_users'
down_revision = '698b90a4bf92'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Drop stale type if exists
    op.execute("DROP TYPE IF EXISTS userrole_enum CASCADE;")
    
    # Create table using inline enum definition (let SQLAlchemy handle it ONCE)
    op.create_table(
        'users',
        sa.Column('id', sa.String(length=26), nullable=False),
        sa.Column('organization_id', sa.Integer(), nullable=False),
        sa.Column('email', sa.String(length=255), nullable=False),
        sa.Column('display_name', sa.String(length=255), nullable=True),
        sa.Column('role', sa.Enum('ADMIN', 'AUDITOR', 'VIEWER', name='userrole_enum', create_type=True), nullable=False, server_default='VIEWER'),
        sa.Column('active', sa.Boolean(), nullable=False, server_default='true'),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.ForeignKeyConstraint(['organization_id'], ['organizations.id'], ),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('organization_id', 'email', name='uq_user_org_email')
    )
    op.create_index(op.f('ix_users_id'), 'users', ['id'], unique=False)
    op.create_index(op.f('ix_users_organization_id'), 'users', ['organization_id'], unique=False)
    op.create_index(op.f('ix_users_active'), 'users', ['active'], unique=False)
    
    # Create trigger for updated_at (PostgreSQL)
    op.execute("""
        CREATE OR REPLACE FUNCTION update_updated_at_column()
        RETURNS TRIGGER AS $$
        BEGIN
            NEW.updated_at = NOW();
            RETURN NEW;
        END;
        $$ language 'plpgsql';
    """)
    op.execute("""
        CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
        FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    """)


def downgrade() -> None:
    # Drop trigger
    op.execute('DROP TRIGGER IF EXISTS update_users_updated_at ON users;')
    op.execute('DROP FUNCTION IF EXISTS update_updated_at_column() CASCADE;')
    
    # Drop table
    op.drop_index(op.f('ix_users_active'), table_name='users')
    op.drop_index(op.f('ix_users_organization_id'), table_name='users')
    op.drop_index(op.f('ix_users_id'), table_name='users')
    op.drop_table('users')
    
    # Drop enum type
    op.execute("DROP TYPE IF EXISTS userrole_enum CASCADE;")

