"""Audit log router."""
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Header, Query, status
from sqlalchemy.orm import Session

from app.db import AuditLog, Org, OrgUser, User, get_db
from app.deps import get_org_by_api_key
from app.schemas import AuditLogOut

router = APIRouter(prefix="/v1/audit", tags=["Audit"])


@router.get("", response_model=list[AuditLogOut])
def list_audit_logs(
    org: Org = Depends(get_org_by_api_key),
    limit: int = Query(100, ge=1, le=1000, description="Maximum number of logs to return"),
    db: Session = Depends(get_db),
):
    """
    List audit logs for the organization.
    Requires X-API-Key header for authentication.
    """
    logs = (
        db.query(AuditLog)
        .filter(AuditLog.org_id == org.id)
        .order_by(AuditLog.created_at.desc())
        .limit(limit)
        .all()
    )
    return logs
