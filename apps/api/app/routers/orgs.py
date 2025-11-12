"""Organization router."""
import secrets
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Path, status
from sqlalchemy.orm import Session

from app.db import Org, OrgMember, OrgUser, User, get_db, Consent, AuditLog, DataRightRequest
from app.deps import get_current_user, require_role
from app.schemas import OrgCreate, OrgDetailOut, OrgOut, OrgUserCreate
from app.services.audit_service import log_action

router = APIRouter(prefix="/orgs", tags=["Organizations"])


@router.get("", response_model=list[OrgOut])
def list_orgs(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """List organizations accessible to the current user."""
    # Superadmins can see all orgs
    if current_user.is_superadmin:
        return db.query(Org).all()
    
    # Regular users see only orgs they're members of (via join)
    return (
        db.query(Org)
        .join(OrgUser)
        .filter(OrgUser.user_id == current_user.id)
        .all()
    )


@router.post("", response_model=OrgOut, status_code=status.HTTP_201_CREATED)
def create_org(
    org_data: OrgCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Create organization with auto-generated API key."""
    # Generate secure API key
    api_key = secrets.token_hex(16)

    org = Org(
        name=org_data.name,
        region=org_data.region,
        api_key=api_key,
    )
    db.add(org)
    db.flush()  # Flush to get org.id
    
    # Only add creator as admin member if they are NOT a superadmin
    # Superadmins operate at platform level and should NOT be linked to orgs
    if not current_user.is_superadmin:
        # Regular users are automatically added as admin
        membership = OrgUser(
            org_id=org.id,
            user_id=current_user.id,
            role="admin",
        )
        db.add(membership)
    # Superadmins are NOT added to orgs - they manage orgs from platform level
    
    db.commit()
    db.refresh(org)

    # Log audit action
    log_action(
        org_id=org.id,
        user_email=current_user.email if current_user else None,
        action="created",
        entity_type="org",
        entity_id=org.id,
        metadata={"name": org.name, "region": org.region},
    )

    return org


@router.get("/{org_id}")
def get_org(
    org_id: UUID = Path(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get organization details with users."""
    # For superadmins, return detailed info with users from OrgUser
    if current_user.is_superadmin:
        org = db.query(Org).filter(Org.id == org_id).first()
        if not org:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Organization not found",
            )

        # Get org users (OrgUser join User)
        users = (
            db.query(OrgUser, User)
            .join(User, OrgUser.user_id == User.id)
            .filter(OrgUser.org_id == org_id)
            .all()
        )

        return {
            "id": str(org.id),
            "name": org.name,
            "region": org.region if hasattr(org, "region") else "N/A",
            "created_at": org.created_at.isoformat() if hasattr(org, "created_at") else None,
            "users": [
                {"email": user.email, "role": org_user.role}
                for org_user, user in users
            ],
            "consents": db.query(Consent).filter(Consent.org_id == org.id).count(),
            "api_logs": db.query(AuditLog).filter(AuditLog.org_id == org.id).count(),
            "data_rights": db.query(DataRightRequest).filter(DataRightRequest.org_id == org.id).count(),
        }
    
    # For regular users, use the original response model
    org = db.query(Org).filter(Org.id == org_id).first()
    if not org:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Organization not found",
        )

    # Get org members
    members = db.query(OrgMember).filter(OrgMember.org_id == org_id).all()

    return OrgDetailOut(
        id=org.id,
        name=org.name,
        region=org.region,
        api_key=org.api_key,
        created_at=org.created_at,
        users=members,
    )


@router.delete("/{org_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_org(
    org_id: UUID = Path(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Delete organization (cascades to users)."""
    org = db.query(Org).filter(Org.id == org_id).first()
    if not org:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Organization not found",
        )

    # Log audit action before deletion
    log_action(
        org_id=org_id,
        user_email=current_user.email if current_user else None,
        action="deleted",
        entity_type="org",
        entity_id=org_id,
        metadata={"name": org.name},
    )

    db.delete(org)
    db.commit()

    return None


@router.post("/{org_id}/users", status_code=status.HTTP_201_CREATED)
def add_user_to_org(
    org_id: UUID = Path(..., description="Organization ID from path"),
    user_data: OrgUserCreate = None,
    current_user: User = Depends(get_current_user),
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
    if user_data.role not in ("admin", "editor", "viewer"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Role must be 'admin', 'editor', or 'viewer'",
        )

    membership = OrgUser(org_id=org_id, user_id=user_data.user_id, role=user_data.role)
    db.add(membership)
    db.commit()

    # Log audit action
    log_action(
        org_id=org_id,
        user_email=current_user.email if current_user else None,
        action="added_user",
        entity_type="org_user",
        entity_id=membership.id,
        metadata={
            "user_id": str(user_data.user_id),
            "role": user_data.role,
        },
    )

    return {
        "message": "User added to organization",
        "org_id": str(org_id),
        "user_id": str(user_data.user_id),
        "role": user_data.role,
    }

