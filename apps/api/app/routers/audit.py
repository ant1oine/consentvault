"""Audit log router (read-only)."""
import json
from datetime import datetime

from fastapi import APIRouter, Body, Depends, HTTPException, Query, Request
from redis import Redis
from rq import Queue
from sqlalchemy.orm import Session

from apps.api.app.core.config import settings
from apps.api.app.core.rate_limit import rate_limiter
from apps.api.app.db.session import get_db
from apps.api.app.deps.auth import verify_api_key_auth
from apps.api.app.models.api_key import ApiKey
from apps.api.app.models.audit_log import ApiAuditLog
from apps.api.app.models.organization import Organization
from apps.api.app.schemas.audit import AuditLogResponse
from apps.api.app.services.audit import AuditService
from apps.api.app.workers.audit_worker import log_ui_event_task

router = APIRouter(prefix="/v1/audit", tags=["audit"])

# Redis connection and RQ queue for async audit logging
redis_conn = Redis.from_url(settings.redis_url, decode_responses=True)
audit_queue = Queue("audit", connection=redis_conn)

# Rate limiting configuration for UI events
RATE_LIMIT = 20  # max 20 UI events per 5 minutes
WINDOW = 300  # 5 minutes (in seconds)


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


@router.post("/ui-events")
async def log_ui_event(
    payload: dict = Body(...),
    request: Request = None,
    auth: tuple[ApiKey, Organization] = Depends(verify_api_key_auth),
):
    """Secure endpoint for non-blocking UI analytics ingestion."""
    api_key, org = auth

    # Validate payload
    if not payload or "event" not in payload:
        raise HTTPException(status_code=400, detail="Invalid UI event payload: missing 'event' field")

    # Per-key rate limiting using sliding window
    key = f"ui_events:{api_key.id}"
    now = datetime.utcnow().timestamp()

    # Get existing timestamps within the window
    timestamps = redis_conn.lrange(key, 0, -1)
    timestamps = [float(ts) for ts in timestamps if now - float(ts) < WINDOW]

    # Check rate limit before adding new event
    if len(timestamps) >= RATE_LIMIT:
        raise HTTPException(
            status_code=429,
            detail=f"Rate limit exceeded for UI events: {RATE_LIMIT} events per {WINDOW} seconds",
        )

    # Clean up old entries and rebuild list with new timestamp
    redis_conn.delete(key)
    timestamps.append(now)
    for ts in timestamps:
        redis_conn.rpush(key, str(ts))
    redis_conn.expire(key, WINDOW)

    # Enqueue background write (non-blocking)
    audit_queue.enqueue(
        log_ui_event_task,
        payload,
        api_key.id,
        org.id,
    )

    return {"queued": True, "events_in_window": len(timestamps)}


