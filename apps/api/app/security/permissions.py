"""
Central permission matrix for ConsentVault.

Defines role-based capabilities in a declarative, extensible structure.
"""

from typing import Dict, List

ROLE_PERMISSIONS: Dict[str, Dict[str, List[str]]] = {
    "superadmin": {
        "*": ["read", "write", "delete", "manage_roles", "view_sensitive"]
    },
    "admin": {
        "consents": ["read", "write", "revoke"],
        "data_rights": ["read", "write"],
        "orgs": ["read", "write", "add_user"],
        "audit": ["read_sensitive"],
    },
    "manager": {
        "consents": ["read", "write"],
        "data_rights": ["read"],
        "audit": ["read"],
    },
    "viewer": {
        "consents": ["read"],
        "data_rights": ["read"],
    },
}


def check_permission(role: str, resource: str, action: str) -> bool:
    """Check if a role is allowed to perform a given action on a resource."""
    if role == "superadmin":
        return True
    if role not in ROLE_PERMISSIONS:
        return False

    perms = ROLE_PERMISSIONS[role]

    if "*" in perms and action in perms["*"]:
        return True

    if resource in perms and action in perms[resource]:
        return True

    return False


def can_role_write(role: str) -> bool:
    """Convenience method for write operations (used in can_write)."""
    return check_permission(role, "consents", "write") or check_permission(role, "orgs", "write")


def can_role_view_sensitive(role: str) -> bool:
    """Convenience method for viewing sensitive info (used in can_view_sensitive)."""
    return check_permission(role, "audit", "read_sensitive")


def has_minimum_role(user_role: str, required_role: str) -> bool:
    """
    Check if user_role meets the minimum required_role level.
    Role hierarchy: viewer < manager/editor < admin < superadmin
    """
    if user_role == "superadmin":
        return True
    
    # Support 'editor' as alias for 'manager' for backward compatibility
    if user_role == "editor":
        user_role = "manager"
    if required_role == "editor":
        required_role = "manager"
    
    # Define role hierarchy levels
    role_levels = {"viewer": 1, "manager": 2, "admin": 3}
    
    user_level = role_levels.get(user_role, 0)
    required_level = role_levels.get(required_role, 0)
    
    return user_level >= required_level

