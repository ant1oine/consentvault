"""Dependencies for FastAPI routes."""
from uuid import UUID

from fastapi import Depends, Header, HTTPException, Query, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session

from app.db import Org, OrgUser, User, get_db
from app.security import verify_token
from app.security.permissions import has_minimum_role

security = HTTPBearer()
security_optional = HTTPBearer(auto_error=False)


def get_org_by_api_key(
    x_api_key: str | None = Header(None, alias="X-API-Key"),
    db: Session = Depends(get_db),
) -> Org:
    """
    Validates organization based on provided X-API-Key header.
    Used by consent/data-rights/audit endpoints.
    """
    if not x_api_key:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing API key",
        )

    org = db.query(Org).filter(Org.api_key == x_api_key).first()
    if not org:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid API key",
        )

    return org


def get_current_user_optional(
    token: HTTPAuthorizationCredentials | None = Depends(security_optional),
    db: Session = Depends(get_db),
) -> User | None:
    """Get current authenticated user from JWT token (optional - returns None if no token)."""
    if not token:
        return None
    try:
        payload = verify_token(token.credentials)
    except Exception:
        return None

    user_id_str = payload.get("sub")
    if not user_id_str:
        return None

    try:
        user_id = UUID(user_id_str)
    except (ValueError, TypeError):
        return None

    user = db.query(User).filter(User.id == user_id).first()
    return user


def get_current_user(
    token: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db),
) -> User:
    """Get current authenticated user from JWT token."""
    try:
        payload = verify_token(token.credentials)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Invalid token: {str(e)}",
        )

    user_id_str = payload.get("sub")
    if not user_id_str:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token missing user ID",
        )

    try:
        user_id = UUID(user_id_str)
    except (ValueError, TypeError):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid user ID format",
        )

    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found",
        )

    return user


def get_current_org(
    org_id_header: UUID | None = Header(None, alias="X-Org-ID"),
    org_id_query: UUID | None = Query(None, alias="org_id"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> Org:
    """
    Get current organization from either:
    - X-Org-ID header (preferred)
    - or ?org_id query param (fallback)
    
    Superadmins can access any org without membership validation.
    """
    target_org_id = org_id_header or org_id_query
    if not target_org_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Organization ID required via X-Org-ID header or ?org_id query param",
        )

    # Superadmins can access any org
    if current_user.is_superadmin:
        org = db.query(Org).filter(Org.id == target_org_id).first()
        if not org:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Organization not found",
            )
        return org

    # Verify user membership in org
    membership = (
        db.query(OrgUser)
        .filter(OrgUser.org_id == target_org_id, OrgUser.user_id == current_user.id)
        .first()
    )
    if not membership:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User is not a member of this organization",
        )

    org = db.query(Org).filter(Org.id == target_org_id).first()
    if not org:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Organization not found",
        )

    return org


def require_role(required_role: str):
    """Dependency factory to enforce minimum role in organization."""

    def role_check(
        current_org: Org = Depends(get_current_org),
        current_user: User = Depends(get_current_user),
        db: Session = Depends(get_db),
    ) -> OrgUser:
        """Ensure the user has at least the specified role in the current org."""
        # Superadmins bypass role checks
        if current_user.is_superadmin:
            # Return a dummy OrgUser-like object for superadmins
            # This allows endpoints to work but superadmins have full access
            class SuperadminMembership:
                def __init__(self):
                    self.org_id = current_org.id
                    self.user_id = current_user.id
                    self.role = "admin"
            return SuperadminMembership()

        membership = (
            db.query(OrgUser)
            .filter(
                OrgUser.org_id == current_org.id,
                OrgUser.user_id == current_user.id,
            )
            .first()
        )
        if not membership:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="User is not a member of this organization",
            )

        if not has_minimum_role(membership.role, required_role):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Requires '{required_role}' permission or higher for orgs",
            )

        return membership

    return role_check
