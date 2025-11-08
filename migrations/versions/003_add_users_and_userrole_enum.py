"""Add users table and userrole enum

Revision ID: 003_add_users_and_userrole_enum
Revises: 002_users
Create Date: 2024-01-03 00:00:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = '003_add_users_and_userrole_enum'
down_revision = '002_users'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Drop any stale or duplicate enum types if they exist
    op.execute("DROP TYPE IF EXISTS userrole CASCADE;")
    op.execute("DROP TYPE IF EXISTS userrole_enum CASCADE;")
    
    # Create the userrole enum type
    # Use native_enum=False to ensure compatibility across databases
    userrole_enum = sa.Enum('ADMIN', 'AUDITOR', 'VIEWER', name='userrole', native_enum=False)
    userrole_enum.create(op.get_bind(), checkfirst=True)
    
    # Drop users table if it exists (to ensure clean state)
    op.execute("DROP TABLE IF EXISTS users CASCADE;")
    
    # Drop trigger function if it exists
    op.execute("DROP FUNCTION IF EXISTS update_updated_at_column() CASCADE;")
    
    # Create users table
    op.create_table(
        'users',
        sa.Column('id', sa.String(length=26), nullable=False),
        sa.Column('organization_id', sa.Integer(), nullable=False),
        sa.Column('email', sa.String(length=255), nullable=False),
        sa.Column('display_name', sa.String(length=255), nullable=True),
        sa.Column('role', userrole_enum, nullable=False, server_default='VIEWER'),
        sa.Column('active', sa.Boolean(), nullable=False, server_default='true'),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.ForeignKeyConstraint(['organization_id'], ['organizations.id'], ),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('organization_id', 'email', name='uq_user_org_email')
    )
    
    # Create indices
    op.create_index('ix_users_id', 'users', ['id'], unique=False)
    op.create_index('ix_users_organization_id', 'users', ['organization_id'], unique=False)
    op.create_index('ix_users_active', 'users', ['active'], unique=False)
    
    # Create trigger function for updated_at
    op.execute("""
        CREATE OR REPLACE FUNCTION update_updated_at_column()
        RETURNS TRIGGER AS $$
        BEGIN
            NEW.updated_at = NOW();
            RETURN NEW;
        END;
        $$ language 'plpgsql';
    """)
    
    # Create trigger
    op.execute("""
        CREATE TRIGGER update_users_updated_at 
        BEFORE UPDATE ON users
        FOR EACH ROW 
        EXECUTE FUNCTION update_updated_at_column();
    """)


def downgrade() -> None:
    # Drop trigger
    op.execute('DROP TRIGGER IF EXISTS update_users_updated_at ON users;')
    
    # Drop trigger function
    op.execute('DROP FUNCTION IF EXISTS update_updated_at_column() CASCADE;')
    
    # Drop indices
    op.drop_index('ix_users_active', table_name='users')
    op.drop_index('ix_users_organization_id', table_name='users')
    op.drop_index('ix_users_id', table_name='users')
    
    # Drop table
    op.drop_table('users')
    
    # Drop enum type
    op.execute('DROP TYPE IF EXISTS userrole CASCADE;')

