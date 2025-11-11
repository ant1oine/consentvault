"""Users router for org members."""
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Path, Query, status
from sqlalchemy.orm import Session

from app.db import Org, OrgMember, get_db
from app.schemas import OrgMemberCreate, OrgMemberOut
from app.services.audit_service import log_action

router = APIRouter(prefix="/v1/users", tags=["Users"])


@router.post("", response_model=OrgMemberOut, status_code=status.HTTP_201_CREATED)
def create_user(
    user_data: OrgMemberCreate,
    db: Session = Depends(get_db),
):
    """Create user linked to organization."""
    # Verify org exists
    org = db.query(Org).filter(Org.id == user_data.org_id).first()
    if not org:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Organization not found",
        )

    # Check if user already exists for this org
    existing = (
        db.query(OrgMember)
        .filter(OrgMember.org_id == user_data.org_id, OrgMember.email == user_data.email)
        .first()
    )
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User with this email already exists for this organization",
        )

    user = OrgMember(
        org_id=user_data.org_id,
        email=user_data.email,
        name=user_data.name,
        role=user_data.role,
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    # Log audit action
    log_action(
        org_id=user_data.org_id,
        user_email=None,  # No authenticated user context
        action="created",
        entity_type="org_member",
        entity_id=user.id,
        metadata={
            "email": user.email,
            "name": user.name,
            "role": user.role,
        },
    )

    return user


@router.get("", response_model=list[OrgMemberOut])
def list_users(
    org_id: UUID = Query(..., description="Organization ID"),
    db: Session = Depends(get_db),
):
    """List users for an organization."""
    # Verify org exists
    org = db.query(Org).filter(Org.id == org_id).first()
    if not org:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Organization not found",
        )

    users = db.query(OrgMember).filter(OrgMember.org_id == org_id).all()
    return users


@router.delete("/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_user(
    user_id: UUID = Path(...),
    db: Session = Depends(get_db),
):
    """Remove user."""
    user = db.query(OrgMember).filter(OrgMember.id == user_id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found",
        )

    # Log audit action before deletion
    log_action(
        org_id=user.org_id,
        user_email=None,  # No authenticated user context
        action="deleted",
        entity_type="org_member",
        entity_id=user_id,
        metadata={"email": user.email, "name": user.name},
    )

    db.delete(user)
    db.commit()

    return None

