"""Audit metrics and timeseries router for compliance overview."""
from datetime import UTC, datetime, timedelta
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import case, func
from sqlalchemy.orm import Session

from apps.api.app.db.session import get_db
from apps.api.app.deps.auth import verify_api_key_auth
from apps.api.app.models.api_key import ApiKey, ApiKeyRole
from apps.api.app.models.audit_log import ApiAuditLog
from apps.api.app.models.organization import Organization

router = APIRouter(prefix="/v1/admin/audit", tags=["audit"])


def _apply_org_filter(query, organization_id: Optional[int]):
    """Apply organization filter to query if provided."""
    if organization_id is not None:
        return query.filter(ApiAuditLog.organization_id == organization_id)
    return query


@router.get("/metrics")
async def get_audit_metrics(
    organization_id: Optional[int] = Query(None, description="Filter by organization ID"),
    db: Session = Depends(get_db),
    auth: tuple[ApiKey, Organization] = Depends(verify_api_key_auth),
):
    """Get audit metrics for compliance overview (superadmin only)."""
    api_key, org = auth

    if api_key.role != ApiKeyRole.SUPERADMIN:
        raise HTTPException(status_code=403, detail="Forbidden: Only superadmins can access metrics")

    base_query = db.query(ApiAuditLog)
    base_query = _apply_org_filter(base_query, organization_id)

    # Total events
    total_events = base_query.count()

    # Total organizations (distinct)
    if organization_id is None:
        total_orgs = db.query(func.count(func.distinct(ApiAuditLog.organization_id))).scalar()
    else:
        total_orgs = 1

    # Total API keys (distinct)
    total_api_keys = (
        _apply_org_filter(db.query(func.count(func.distinct(ApiAuditLog.api_key_id))), organization_id)
        .scalar()
    )

    # Last 24 hours
    last_24h_start = datetime.now(UTC) - timedelta(hours=24)
    last_24h_query = base_query.filter(ApiAuditLog.created_at >= last_24h_start)
    last_24h_events = last_24h_query.count()

    # Status breakdown for last 24h
    status_2xx = last_24h_query.filter(
        ApiAuditLog.status_code.between(200, 299)
    ).count()
    status_4xx = last_24h_query.filter(
        ApiAuditLog.status_code.between(400, 499)
    ).count()
    status_5xx = last_24h_query.filter(
        ApiAuditLog.status_code.between(500, 599)
    ).count()

    # Verification stats
    verified_query = base_query.filter(ApiAuditLog.verified_at.isnot(None))
    verified_count = verified_query.count()
    unverified_count = total_events - verified_count
    verification_rate = verified_count / total_events if total_events > 0 else 0.0

    # Top endpoints (last 30 days)
    top_endpoints_query = base_query.filter(
        ApiAuditLog.created_at >= datetime.now(UTC) - timedelta(days=30)
    )
    top_endpoints = (
        top_endpoints_query.with_entities(
            ApiAuditLog.path,
            func.count(ApiAuditLog.id).label("count"),
        )
        .group_by(ApiAuditLog.path)
        .order_by(func.count(ApiAuditLog.id).desc())
        .limit(10)
        .all()
    )

    # Recent unsigned exports (7d) - TODO: implement proper tracking
    # For now, return 0 as this requires tracking export calls separately
    recent_unsigned_exports_7d = 0

    return {
        "totals": {
            "events": total_events,
            "organizations": total_orgs,
            "api_keys": total_api_keys,
        },
        "last_24h": {
            "events": last_24h_events,
            "by_status": {
                "2xx": status_2xx,
                "4xx": status_4xx,
                "5xx": status_5xx,
            },
        },
        "verification": {
            "verified": verified_count,
            "unverified": unverified_count,
            "rate": round(verification_rate, 4),
        },
        "top_endpoints": [
            {"path": path, "count": count} for path, count in top_endpoints
        ],
        "recent_unsigned_exports_7d": recent_unsigned_exports_7d,
    }


@router.get("/timeseries")
async def get_audit_timeseries(
    organization_id: Optional[int] = Query(None, description="Filter by organization ID"),
    window: str = Query("24h", regex="^(24h|7d|30d)$", description="Time window"),
    bucket: str = Query("hour", regex="^(hour|day)$", description="Bucket size"),
    db: Session = Depends(get_db),
    auth: tuple[ApiKey, Organization] = Depends(verify_api_key_auth),
):
    """Get audit log timeseries data (superadmin only)."""
    api_key, org = auth

    if api_key.role != ApiKeyRole.SUPERADMIN:
        raise HTTPException(status_code=403, detail="Forbidden: Only superadmins can access timeseries")

    # Calculate time window
    now = datetime.now(UTC)
    if window == "24h":
        start_time = now - timedelta(hours=24)
        trunc_func = func.date_trunc("hour", ApiAuditLog.created_at) if bucket == "hour" else func.date_trunc("day", ApiAuditLog.created_at)
    elif window == "7d":
        start_time = now - timedelta(days=7)
        trunc_func = func.date_trunc("day", ApiAuditLog.created_at)
    else:  # 30d
        start_time = now - timedelta(days=30)
        trunc_func = func.date_trunc("day", ApiAuditLog.created_at)

    base_query = db.query(ApiAuditLog).filter(ApiAuditLog.created_at >= start_time)
    base_query = _apply_org_filter(base_query, organization_id)

    # Build query with status code buckets
    series_query = (
        base_query.with_entities(
            trunc_func.label("ts"),
            func.count(ApiAuditLog.id).label("events"),
            func.sum(
                case((ApiAuditLog.status_code.between(200, 299), 1), else_=0)
            ).label("s2xx"),
            func.sum(
                case((ApiAuditLog.status_code.between(400, 499), 1), else_=0)
            ).label("s4xx"),
            func.sum(
                case((ApiAuditLog.status_code.between(500, 599), 1), else_=0)
            ).label("s5xx"),
        )
        .group_by(trunc_func)
        .order_by(trunc_func)
    )

    results = series_query.all()

    series = [
        {
            "ts": ts.isoformat() if ts else None,
            "events": events or 0,
            "s2xx": int(s2xx or 0),
            "s4xx": int(s4xx or 0),
            "s5xx": int(s5xx or 0),
        }
        for ts, events, s2xx, s4xx, s5xx in results
    ]

    return {
        "window": window,
        "bucket": bucket,
        "series": series,
    }

