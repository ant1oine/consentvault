"""Consent router."""
from datetime import datetime
from typing import List, Optional

from fastapi import APIRouter, Depends, Request, Query
from sqlalchemy.orm import Session

from apps.api.app.db.session import get_db
from apps.api.app.deps.auth import verify_api_key_auth
from apps.api.app.models.api_key import ApiKey
from apps.api.app.models.organization import Organization
from apps.api.app.schemas.consent import ConsentCreate, ConsentResponse, ConsentEventResponse, ConsentWithdraw
from apps.api.app.services.consent import ConsentService
from apps.api.app.core.rate_limit import rate_limiter

router = APIRouter(prefix="/v1/consents", tags=["consents"])


@router.post("", response_model=ConsentResponse, status_code=201)
async def create_consent(
    data: ConsentCreate,
    request: Request,
    db: Session = Depends(get_db),
    auth: tuple[ApiKey, Organization] = Depends(verify_api_key_auth),
):
    """Create or update consent."""
    api_key, org = auth

    # Rate limit
    await rate_limiter.check_rate_limit(str(api_key.id), request)

    # Get IP and user agent
    ip_address = request.client.host if request.client else None
    user_agent = request.headers.get("user-agent")

    consent_service = ConsentService(db)
    aggregate = consent_service.create_or_update_consent(
        organization_id=org.id,
        external_user_id=data.external_user_id,
        purpose_code=data.purpose_code,
        status=data.status,
        method=data.method,
        source=data.source,
        system_code=data.system_code,
        evidence_ref=data.evidence_ref,
        encrypted_fields=data.encrypted_fields,
        api_key_id=api_key.id,
        ip_address=ip_address,
        user_agent=user_agent,
    )

    # Add purpose_code to response
    response_dict = aggregate.to_dict()
    response_dict["purpose_code"] = data.purpose_code
    return response_dict


@router.get("/latest", response_model=ConsentResponse)
async def get_latest_consent(
    external_user_id: str = Query(...),
    purpose_code: str = Query(...),
    request: Request = None,
    db: Session = Depends(get_db),
    auth: tuple[ApiKey, Organization] = Depends(verify_api_key_auth),
):
    """Get latest consent for user and purpose."""
    api_key, org = auth

    # Rate limit
    await rate_limiter.check_rate_limit(str(api_key.id), request)

    consent_service = ConsentService(db)
    aggregate = consent_service.get_latest_consent(org.id, external_user_id, purpose_code)

    if not aggregate:
        from apps.api.app.core.errors import NotFoundError
        raise NotFoundError("Consent not found")

    # Get purpose code
    from apps.api.app.models.purpose import Purpose
    purpose = db.query(Purpose).filter(Purpose.id == aggregate.purpose_id).first()
    response_dict = aggregate.to_dict()
    response_dict["purpose_code"] = purpose.code if purpose else None
    return response_dict


@router.get("", response_model=List[ConsentResponse])
async def list_consents(
    limit: int = Query(100, le=1000),
    offset: int = Query(0, ge=0),
    request: Request = None,
    db: Session = Depends(get_db),
    auth: tuple[ApiKey, Organization] = Depends(verify_api_key_auth),
):
    """List consent aggregates."""
    api_key, org = auth

    # Rate limit
    await rate_limiter.check_rate_limit(str(api_key.id), request)

    consent_service = ConsentService(db)
    aggregates = consent_service.list_aggregates(org.id, limit=limit, offset=offset)
    
    # Get purpose codes for each aggregate
    from apps.api.app.models.purpose import Purpose
    results = []
    for aggregate in aggregates:
        purpose = db.query(Purpose).filter(Purpose.id == aggregate.purpose_id).first()
        response_dict = aggregate.to_dict()
        response_dict["purpose_code"] = purpose.code if purpose else None
        results.append(response_dict)
    
    return results


@router.get("/events", response_model=List[ConsentEventResponse])
async def list_consent_events(
    since: Optional[datetime] = Query(None),
    limit: int = Query(100, le=1000),
    offset: int = Query(0, ge=0),
    request: Request = None,
    db: Session = Depends(get_db),
    auth: tuple[ApiKey, Organization] = Depends(verify_api_key_auth),
):
    """List consent events."""
    api_key, org = auth

    # Rate limit
    await rate_limiter.check_rate_limit(str(api_key.id), request)

    consent_service = ConsentService(db)
    events = consent_service.list_events(org.id, since=since, limit=limit, offset=offset)
    return events


@router.post("/{external_user_id}/withdraw", response_model=ConsentResponse, status_code=201)
async def withdraw_consent(
    external_user_id: str,
    data: ConsentWithdraw,
    request: Request,
    db: Session = Depends(get_db),
    auth: tuple[ApiKey, Organization] = Depends(verify_api_key_auth),
):
    """Withdraw consent for a user and purpose."""
    api_key, org = auth

    # Rate limit
    await rate_limiter.check_rate_limit(str(api_key.id), request)

    # Get IP and user agent
    ip_address = request.client.host if request.client else None
    user_agent = request.headers.get("user-agent")

    consent_service = ConsentService(db)
    from apps.api.app.models.consent import ConsentStatus, ConsentMethod

    aggregate = consent_service.create_or_update_consent(
        organization_id=org.id,
        external_user_id=external_user_id,
        purpose_code=data.purpose_code,
        status=ConsentStatus.WITHDRAWN,
        method=ConsentMethod.OTHER,
        source="api",
        api_key_id=api_key.id,
        ip_address=ip_address,
        user_agent=user_agent,
    )

    # Add purpose_code to response
    response_dict = aggregate.to_dict()
    response_dict["purpose_code"] = data.purpose_code
    return response_dict


