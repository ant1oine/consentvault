"""Audit log router (read-only)."""
from datetime import datetime

from fastapi import APIRouter, Depends, Query, Request
from sqlalchemy.orm import Session

from apps.api.app.core.rate_limit import rate_limiter
from apps.api.app.db.session import get_db
from apps.api.app.deps.auth import verify_api_key_auth
from apps.api.app.models.api_key import ApiKey
from apps.api.app.models.organization import Organization
from apps.api.app.schemas.audit import AuditLogResponse
from apps.api.app.services.audit import AuditService

router = APIRouter(prefix="/v1/audit", tags=["audit"])


@router.get("", response_model=list[AuditLogResponse])
async def list_audit_logs(
    event_type: str | None = Query(None),
    object_type: str | None = Query(None),
    since: datetime | None = Query(None),
    limit: int = Query(100, le=1000),
    offset: int = Query(0, ge=0),
    request: Request = None,
    db: Session = Depends(get_db),
    auth: tuple[ApiKey, Organization] = Depends(verify_api_key_auth),
):
    """List audit logs (auditor/admin only)."""
    api_key, org = auth

    # Rate limit
    await rate_limiter.check_rate_limit(str(api_key.id), request)

    audit_service = AuditService(db)
    logs = audit_service.list_events(
        organization_id=org.id,
        event_type=event_type,
        object_type=object_type,
        since=since,
        limit=limit,
        offset=offset,
    )
    return logs


