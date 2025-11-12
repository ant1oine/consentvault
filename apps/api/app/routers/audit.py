"""Audit log router."""
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Header, Query, status
from sqlalchemy.orm import Session

from app.db import AuditLog, Org, OrgUser, User, get_db
from app.deps import get_org_by_api_key, get_current_user_optional, get_current_user
from app.schemas import AuditLogOut

router = APIRouter(prefix="/audit", tags=["Audit"])


@router.get("/logs")
def get_audit_logs(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Get audit logs scoped to user's organization.
    Superadmins see all logs; regular users see logs for their org.
    Viewers see limited logs (no sensitive actions).
    """
    from app.security.roles import get_user_org_membership, can_view_sensitive
    
    q = db.query(AuditLog).order_by(AuditLog.created_at.desc())
    
    # Superadmins see all logs
    if not current_user.is_superadmin:
        org_user = get_user_org_membership(current_user, db)
        if not org_user:
            raise HTTPException(status_code=403, detail="User not part of any organization")
        
        # Scope to user's organization
        q = q.filter(AuditLog.org_id == org_user.org_id)
        
        # Viewers see limited logs (no sensitive actions like exports)
        if not can_view_sensitive(current_user, db):
            q = q.filter(~AuditLog.action.ilike("%export%"))
    
    logs = q.limit(200).all()
    
    return [
        {
            "timestamp": str(l.created_at),
            "event_type": l.action,
            "actor": l.user_email,
            "details": l.metadata_json,
        }
        for l in logs
    ]


@router.get("", response_model=list[AuditLogOut])
def list_audit_logs(
    x_api_key: str | None = Header(None, alias="X-API-Key"),
    org_id: UUID | None = Query(None, description="Organization ID (optional for superadmins with JWT)"),
    current_user: User | None = Depends(get_current_user_optional),
    limit: int = Query(100, ge=1, le=1000, description="Maximum number of logs to return"),
    db: Session = Depends(get_db),
):
    """
    List audit logs for the organization.
    Supports both X-API-Key header (for API integrations) and JWT auth (for dashboard).
    Superadmins can view all logs without org_id.
    Regular users see logs scoped to their organization.
    Viewers see limited logs (no sensitive actions).
    """
    from app.security.roles import get_user_org_membership, can_view_sensitive
    
    # API key authentication (for API integrations)
    if x_api_key:
        org = db.query(Org).filter(Org.api_key == x_api_key).first()
        if not org:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid API key",
            )
        logs = (
            db.query(AuditLog)
            .filter(AuditLog.org_id == org.id)
            .order_by(AuditLog.created_at.desc())
            .limit(limit)
            .all()
        )
        return logs
    
    # JWT authentication (for dashboard)
    if not current_user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required (API key or JWT token)",
        )
    
    query = db.query(AuditLog).order_by(AuditLog.created_at.desc())
    
    # Superadmins can view all logs
    if current_user.is_superadmin:
        if org_id:
            # Superadmin can filter by specific org if requested
            query = query.filter(AuditLog.org_id == org_id)
    else:
        # Regular users: scope to their organization
        org_user = get_user_org_membership(current_user, db)
        if not org_user:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="User not part of any organization",
            )
        
        # If org_id is provided, verify user has access to it
        if org_id:
            if org_id != org_user.org_id:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="User is not a member of this organization",
                )
            query = query.filter(AuditLog.org_id == org_id)
        else:
            # Auto-scope to user's org
            query = query.filter(AuditLog.org_id == org_user.org_id)
        
        # Viewers see limited logs (no sensitive actions)
        if not can_view_sensitive(current_user, db):
            query = query.filter(~AuditLog.action.ilike("%export%"))
    
    logs = query.limit(limit).all()
    return logs
