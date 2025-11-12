"""make auditlog org_id non-nullable

Revision ID: a2af91b51128
Revises: 08ac03758171
Create Date: 2025-11-12 00:51:16.405004

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = 'a2af91b51128'
down_revision: Union[str, Sequence[str], None] = '08ac03758171'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """
    Make audit_logs.org_id non-nullable.
    
    This ensures all audit events are properly scoped to an organization,
    allowing org admins to see activities related to their organization,
    even when triggered by superadmins.
    
    Any existing audit logs with NULL org_id are deleted since they cannot
    be properly scoped and are not visible to org admins anyway.
    """
    # Delete any existing audit logs with NULL org_id
    # These are not useful since they can't be queried by org admins
    op.execute("DELETE FROM audit_logs WHERE org_id IS NULL")
    
    # Make org_id non-nullable
    op.alter_column(
        'audit_logs',
        'org_id',
        existing_type=postgresql.UUID(as_uuid=True),
        nullable=False,
    )


def downgrade() -> None:
    """
    Revert org_id back to nullable (for rollback purposes).
    Note: This will not restore deleted audit logs.
    """
    op.alter_column(
        'audit_logs',
        'org_id',
        existing_type=postgresql.UUID(as_uuid=True),
        nullable=True,
    )
