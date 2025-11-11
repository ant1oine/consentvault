"""Audit log router."""
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Header, Query, status
from sqlalchemy.orm import Session

from app.db import AuditLog, Org, OrgUser, User, get_db
from app.deps import get_org_by_api_key, get_current_user_optional, get_current_user
from app.schemas import AuditLogOut

router = APIRouter(prefix="/v1/audit", tags=["Audit"])


@router.get("/logs")
def get_audit_logs(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Get audit logs for the current user.
    Superadmins see all logs; regular users see only their own actions.
    """
    q = db.query(AuditLog).order_by(AuditLog.created_at.desc())
    
    # Superadmins see all logs; regular users see only their own actions
    if not current_user.is_superadmin:
        q = q.filter(AuditLog.user_email == current_user.email)
    
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
    """
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
    
    # Superadmins can view all logs
    if current_user.is_superadmin and not org_id:
        logs = (
            db.query(AuditLog)
            .order_by(AuditLog.created_at.desc())
            .limit(limit)
            .all()
        )
        return logs
    
    # Regular users need org_id
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
    
    # For superadmins, allow access to any org; for regular users, check membership
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
    
    logs = (
        db.query(AuditLog)
        .filter(AuditLog.org_id == org_id)
        .order_by(AuditLog.created_at.desc())
        .limit(limit)
        .all()
    )
    return logs
