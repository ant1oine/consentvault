"""Add DataRegion enum values and role to ApiKey"""

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = '698b90a4bf92'
down_revision = '001_initial'
branch_labels = None
depends_on = None


def upgrade():
    # --- Create new Enum type explicitly first ---
    api_key_role_enum = sa.Enum('ADMIN', 'AUDITOR', 'VIEWER', name='apikeyrole')
    api_key_role_enum.create(op.get_bind(), checkfirst=True)

    # --- Add new column using that enum type ---
    op.add_column('api_keys', sa.Column('role', api_key_role_enum, nullable=False, server_default='ADMIN'))

    # --- Extend DataRegion if it’s an enum ---
    # Make sure this matches your model values (add missing ones)
    op.execute("ALTER TYPE dataregion ADD VALUE IF NOT EXISTS 'QATAR'")
    op.execute("ALTER TYPE dataregion ADD VALUE IF NOT EXISTS 'BAHRAIN'")
    op.execute("ALTER TYPE dataregion ADD VALUE IF NOT EXISTS 'OMAN'")
    op.execute("ALTER TYPE dataregion ADD VALUE IF NOT EXISTS 'KUWAIT'")


def downgrade():
    # --- Remove column first ---
    op.drop_column('api_keys', 'role')

    # --- Drop enum type ---
    op.execute('DROP TYPE IF EXISTS apikeyrole')
