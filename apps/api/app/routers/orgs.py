"""Organization router."""
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Path, status
from sqlalchemy.orm import Session

from app.db import Org, OrgUser, User, get_db
from app.deps import get_current_user, require_role
from app.schemas import OrgCreate, OrgOut, OrgUserCreate

router = APIRouter(prefix="/orgs", tags=["Organizations"])


@router.post("", response_model=OrgOut, status_code=status.HTTP_201_CREATED)
def create_org(
    org_data: OrgCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Create organization and auto-add creator as admin."""
    org = Org(name=org_data.name)
    db.add(org)
    db.flush()

    # Add creator as admin
    membership = OrgUser(org_id=org.id, user_id=current_user.id, role="admin")
    db.add(membership)
    db.commit()
    db.refresh(org)

    return org


@router.post("/{org_id}/users", status_code=status.HTTP_201_CREATED)
def add_user_to_org(
    org_id: UUID = Path(..., description="Organization ID from path"),
    user_data: OrgUserCreate = None,
    _membership: OrgUser = Depends(require_role("admin")),
    db: Session = Depends(get_db),
):
    """Add user to organization with role (admin only)."""
    # Verify org exists
    org = db.query(Org).filter(Org.id == org_id).first()
    if not org:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Organization not found",
        )

    # Verify user exists
    user = db.query(User).filter(User.id == user_data.user_id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found",
        )

    # Check if already a member
    existing = (
        db.query(OrgUser)
        .filter(OrgUser.org_id == org_id, OrgUser.user_id == user_data.user_id)
        .first()
    )
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User is already a member of this organization",
        )

    # Validate role
    if user_data.role not in ("admin", "manager", "viewer"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Role must be 'admin', 'manager', or 'viewer'",
        )

    membership = OrgUser(org_id=org_id, user_id=user_data.user_id, role=user_data.role)
    db.add(membership)
    db.commit()

    return {
        "message": "User added to organization",
        "org_id": str(org_id),
        "user_id": str(user_data.user_id),
        "role": user_data.role,
    }
