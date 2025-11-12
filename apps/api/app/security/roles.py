"""Role-based access control helpers."""
from sqlalchemy.orm import Session

from app.db import OrgUser, User
from app.security.permissions import can_role_write, can_role_view_sensitive


def get_user_org_id(user: User, db: Session) -> str | None:
    """
    Get the user's organization ID from their first OrgUser membership.
    Returns None if user has no org memberships.
    Superadmins return None (they see all orgs).
    """
    if user.is_superadmin:
        return None
    
    org_user = db.query(OrgUser).filter(OrgUser.user_id == user.id).first()
    if not org_user:
        return None
    
    return str(org_user.org_id)


def get_user_org_membership(user: User, db: Session) -> OrgUser | None:
    """
    Get the user's OrgUser membership record.
    Returns None if user has no org memberships.
    """
    if user.is_superadmin:
        return None
    
    return db.query(OrgUser).filter(OrgUser.user_id == user.id).first()


def can_write(user: User, db: Session) -> bool:
    """
    Check if user can write (create/update/delete).
    Superadmins and admins can write.
    Managers can read but not write (read-only).
    Viewers cannot write.
    """
    if user.is_superadmin:
        return True
    
    org_user = get_user_org_membership(user, db)
    if not org_user:
        return False
    
    # Support both 'manager' and 'editor' roles for backward compatibility
    role = org_user.role
    if role == "editor":
        role = "manager"  # Map editor to manager for permission checks
    
    return can_role_write(role)


def can_view_sensitive(user: User, db: Session) -> bool:
    """
    Check if user can view sensitive information (detailed audit logs, exports, etc.).
    Superadmins, admins, and managers can view sensitive data.
    Viewers see only summaries.
    """
    if user.is_superadmin:
        return True
    
    org_user = get_user_org_membership(user, db)
    if not org_user:
        return False
    
    # Support both 'manager' and 'editor' roles for backward compatibility
    role = org_user.role
    if role == "editor":
        role = "manager"  # Map editor to manager for permission checks
    
    return can_role_view_sensitive(role)



