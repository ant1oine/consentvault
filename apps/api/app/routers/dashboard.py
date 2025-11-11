"""Dashboard router."""
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.db import Consent, DataRightRequest, Org, OrgMember, OrgUser, User, get_db
from app.deps import get_current_user
from app.schemas import DashboardSummary

router = APIRouter(prefix="/v1/dashboard", tags=["Dashboard"])


@router.get("/summary")
def get_dashboard_summary(
    org_id: UUID | None = Query(None, description="Organization ID (optional for superadmins)"),
    current_user = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get dashboard summary. Superadmins get platform-wide stats, regular users get org stats."""
    # Superadmins get platform-wide stats
    if current_user.is_superadmin and not org_id:
        orgs_count = db.query(func.count(Org.id)).scalar() or 0
        users_count = db.query(func.count(User.id)).scalar() or 0
        consents_count = db.query(func.count(Consent.id)).scalar() or 0
        revocations_count = db.query(func.count(Consent.id)).filter(Consent.revoked_at.isnot(None)).scalar() or 0
        
        return {
            "scope": "platform",
            "orgs": orgs_count,
            "users": users_count,
            "consents": consents_count,
            "revocations": revocations_count,
        }
    
    # Regular users require org_id
    if not org_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Organization ID required",
        )
    
    # Verify org exists and user has access
    org = db.query(Org).filter(Org.id == org_id).first()
    if not org:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Organization not found",
        )
    
    # For regular users, verify membership (superadmins can access any org)
    if not current_user.is_superadmin:
        membership = db.query(OrgUser).filter(
            OrgUser.org_id == org_id,
            OrgUser.user_id == current_user.id
        ).first()
        if not membership:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="User is not a member of this organization",
            )

    # Count active consents (not revoked)
    consents_active = (
        db.query(func.count(Consent.id))
        .filter(Consent.org_id == org_id, Consent.revoked_at.is_(None))
        .scalar()
        or 0
    )

    # Count revocations
    revocations = (
        db.query(func.count(Consent.id))
        .filter(Consent.org_id == org_id, Consent.revoked_at.isnot(None))
        .scalar()
        or 0
    )

    # Count DSARs
    dsar_completed = (
        db.query(func.count(DataRightRequest.id))
        .filter(DataRightRequest.org_id == org_id, DataRightRequest.status == "completed")
        .scalar()
        or 0
    )

    return {
        "scope": "org",
        "org": org.name,
        "consents_active": consents_active,
        "revocations": revocations,
        "dsar_completed": dsar_completed,
    }


@router.get("/platform/orgs")
def list_all_orgs(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """List all organizations with stats (superadmin only)."""
    if not current_user.is_superadmin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied. Superadmin required.",
        )
    
    orgs = db.query(Org).all()
    result = []
    
    for org in orgs:
        user_count = db.query(func.count(OrgUser.id)).filter(OrgUser.org_id == org.id).scalar() or 0
        consent_count = db.query(func.count(Consent.id)).filter(Consent.org_id == org.id).scalar() or 0
        
        result.append({
            "id": str(org.id),
            "name": org.name,
            "region": org.region,
            "users": user_count,
            "consents": consent_count,
            "api_key": org.api_key,
            "created_at": org.created_at.isoformat() if org.created_at else None,
        })
    
    return result


@router.get("/platform/orgs/{org_id}")
def get_org_details(
    org_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get organization details with users (superadmin only)."""
    if not current_user.is_superadmin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied. Superadmin required.",
        )
    
    org = db.query(Org).filter(Org.id == org_id).first()
    if not org:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Organization not found",
        )
    
    # Get users in this org
    users = (
        db.query(User)
        .join(OrgUser)
        .filter(OrgUser.org_id == org.id)
        .all()
    )
    
    # Get user roles
    user_list = []
    for user in users:
        membership = (
            db.query(OrgUser)
            .filter(OrgUser.org_id == org.id, OrgUser.user_id == user.id)
            .first()
        )
        user_list.append({
            "id": str(user.id),
            "email": user.email,
            "role": membership.role if membership else "viewer",
        })
    
    # Get consent stats
    consents_active = (
        db.query(func.count(Consent.id))
        .filter(Consent.org_id == org.id, Consent.revoked_at.is_(None))
        .scalar()
        or 0
    )
    consents_total = (
        db.query(func.count(Consent.id))
        .filter(Consent.org_id == org.id)
        .scalar()
        or 0
    )
    
    return {
        "id": str(org.id),
        "name": org.name,
        "region": org.region,
        "api_key": org.api_key,
        "created_at": org.created_at.isoformat() if org.created_at else None,
        "users": user_list,
        "consents_active": consents_active,
        "consents_total": consents_total,
    }

