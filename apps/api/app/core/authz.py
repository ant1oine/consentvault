"""Authorization dependencies."""
from typing import Literal

from fastapi import Depends, Header

from apps.api.app.core.errors import ForbiddenError
from apps.api.app.deps.auth import verify_api_key_auth
from apps.api.app.models.api_key import ApiKey, ApiKeyRole


def get_organization_id(
    x_organization_id: str | None = Header(None, alias="X-Organization-ID"),
    auth: tuple[ApiKey, any] = Depends(verify_api_key_auth),
) -> int:
    """
    Get organization ID from X-Organization-ID header or fallback to API key's organization.
    """
    api_key, org = auth
    if x_organization_id is not None:
        try:
            org_id = int(x_organization_id)
            if api_key.organization_id != org_id:
                raise ForbiddenError("API key does not have access to the specified organization")
            return org_id
        except ValueError:
            raise ForbiddenError("Invalid organization ID format")
    return api_key.organization_id


def require_role(min_role: Literal["ADMIN", "AUDITOR", "VIEWER"]):
    """
    Dependency factory for RBAC role checking.
    Role hierarchy: SUPERADMIN > ADMIN > AUDITOR > VIEWER
    SUPERADMIN bypasses all role restrictions.
    """
    role_hierarchy = {
        "SUPERADMIN": 4,
        "ADMIN": 3,
        "AUDITOR": 2,
        "VIEWER": 1,
    }

    def role_checker(
        auth: tuple[ApiKey, any] = Depends(verify_api_key_auth),
    ) -> ApiKey:
        """Check if API key has sufficient role."""
        api_key, _ = auth

        api_key_role_map = {
            ApiKeyRole.SUPERADMIN: "SUPERADMIN",
            ApiKeyRole.ADMIN: "ADMIN",
            ApiKeyRole.AUDITOR: "AUDITOR",
            ApiKeyRole.VIEWER: "VIEWER",
        }

        current_role = api_key_role_map.get(api_key.role, "VIEWER")
        
        # SUPERADMIN bypasses all role restrictions
        if current_role == "SUPERADMIN":
            return api_key
        
        current_level = role_hierarchy.get(current_role, 0)
        required_level = role_hierarchy.get(min_role, 0)

        if current_level < required_level:
            raise ForbiddenError(
                f"Insufficient permissions. Required role: {min_role}, current role: {current_role}"
            )

        return api_key

    # ✅ FIX: Return the callable itself, not a Depends() wrapper
    return role_checker
