"""Dependencies for FastAPI routes."""
from uuid import UUID

from fastapi import Depends, Header, HTTPException, Query, status
from fastapi.security import HTTPBearer
from sqlalchemy.orm import Session

from app.db import Org, OrgUser, User, get_db
from app.security import verify_token

security = HTTPBearer()


def get_current_user(
    token: str = Depends(security),
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
    """
    target_org_id = org_id_header or org_id_query
    if not target_org_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Organization ID required via X-Org-ID header or ?org_id query param",
        )

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

        role_hierarchy = {"viewer": 1, "editor": 2, "admin": 3}
        user_level = role_hierarchy.get(membership.role, 0)
        required_level = role_hierarchy.get(required_role, 0)

        if user_level < required_level:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Requires {required_role} role or higher",
            )

        return membership

    return role_check
