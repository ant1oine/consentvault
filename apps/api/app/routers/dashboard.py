"""Dashboard router."""
from fastapi import APIRouter, Depends, HTTPException

from sqlalchemy.orm import Session

from app.db import get_db, Consent, DataRightRequest, AuditLog, Org, OrgUser
from app.deps import get_current_user
from app.security.roles import get_user_org_membership, can_view_sensitive

router = APIRouter(prefix="/dashboard", tags=["Dashboard"])


@router.get("/summary")
def get_summary(
    current_user = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Return top-level counts for dashboard cards, scoped to user's organization."""
    try:
        # Super admin sees everything
        if current_user.is_superadmin:
            api_logs = db.query(AuditLog).count()
            consents = db.query(Consent).count()
            data_rights = db.query(DataRightRequest).count()
            activity = db.query(AuditLog).count()
        else:
            # Determine user's active org
            org_user = get_user_org_membership(current_user, db)
            if not org_user:
                raise HTTPException(status_code=403, detail="User not part of any organization")
            
            org_id = org_user.org_id

            # Scope queries by org_id
            api_logs = db.query(AuditLog).filter(AuditLog.org_id == org_id).count()
            consents = db.query(Consent).filter(Consent.org_id == org_id).count()
            data_rights = db.query(DataRightRequest).filter(DataRightRequest.org_id == org_id).count()
            activity = db.query(AuditLog).filter(AuditLog.org_id == org_id).count()

        return {
            "api_logs": api_logs,
            "consents": consents,
            "data_rights": data_rights,
            "activity": activity,
            "is_superadmin": current_user.is_superadmin,
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to load summary: {str(e)}")


@router.get("/recent")
def get_recent_activity(
    limit: int = 10,
    current_user = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Recent audit trail for dashboard activity, scoped to user's organization."""
    try:
        query = db.query(AuditLog).order_by(AuditLog.created_at.desc())

        if not current_user.is_superadmin:
            org_user = get_user_org_membership(current_user, db)
            if not org_user:
                raise HTTPException(status_code=403, detail="User not part of any organization")
            query = query.filter(AuditLog.org_id == org_user.org_id)
            
            # Viewers see limited activity (no sensitive actions)
            if not can_view_sensitive(current_user, db):
                query = query.filter(~AuditLog.action.ilike("%export%"))

        recent = query.limit(limit).all()
        return [
            {
                "id": str(a.id),
                "action": a.action,
                "timestamp": a.created_at.isoformat(),
            }
            for a in recent
        ]
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get activity: {str(e)}")


@router.get("/orgs")
def list_orgs_with_stats(
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    """Return all organizations with key metrics (for superadmins)."""
    if not current_user.is_superadmin:
        raise HTTPException(status_code=403, detail="Access denied")

    orgs = db.query(Org).all()
    result = []

    for org in orgs:
        user_count = db.query(OrgUser).filter(OrgUser.org_id == org.id).count()
        consent_count = db.query(Consent).filter(Consent.org_id == org.id).count()
        api_logs = db.query(AuditLog).filter(AuditLog.org_id == org.id).count()
        rights = db.query(DataRightRequest).filter(DataRightRequest.org_id == org.id).count()

        result.append({
            "id": str(org.id),
            "name": org.name,
            "region": org.region if hasattr(org, "region") else "N/A",
            "users": user_count,
            "consents": consent_count,
            "api_logs": api_logs,
            "data_rights": rights,
            "created_at": org.created_at.isoformat() if hasattr(org, "created_at") else None,
        })

    return result

