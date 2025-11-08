"""Data rights router."""
from typing import List, Optional

from fastapi import APIRouter, Depends, Request, Query
from sqlalchemy.orm import Session

from apps.api.app.db.session import get_db
from apps.api.app.deps.auth import verify_api_key_auth
from apps.api.app.models.api_key import ApiKey
from apps.api.app.models.organization import Organization
from apps.api.app.models.rights import RequestStatus, DataRight
from apps.api.app.schemas.rights import (
    DataRightRequestCreate,
    DataRightRequestResponse,
    DataRightRequestComplete,
)
from apps.api.app.services.rights import RightsService
from apps.api.app.core.rate_limit import rate_limiter

router = APIRouter(prefix="/v1/rights", tags=["rights"])


@router.post("", response_model=DataRightRequestResponse, status_code=201)
async def create_rights_request(
    data: DataRightRequestCreate,
    request: Request,
    db: Session = Depends(get_db),
    auth: tuple[ApiKey, Organization] = Depends(verify_api_key_auth),
):
    """Create a data rights request."""
    api_key, org = auth

    # Rate limit
    await rate_limiter.check_rate_limit(str(api_key.id), request)

    rights_service = RightsService(db)
    request_obj = rights_service.create_request(
        organization_id=org.id,
        external_user_id=data.external_user_id,
        right=data.right,
        reason=data.reason,
        api_key_id=api_key.id,
    )
    return request_obj


@router.post("/{request_id}/complete", response_model=DataRightRequestResponse)
async def complete_rights_request(
    request_id: str,
    data: DataRightRequestComplete,
    request: Request,
    db: Session = Depends(get_db),
    auth: tuple[ApiKey, Organization] = Depends(verify_api_key_auth),
):
    """Complete a data rights request."""
    api_key, org = auth

    # Rate limit
    await rate_limiter.check_rate_limit(str(api_key.id), request)

    rights_service = RightsService(db)
    request_obj = rights_service.complete_request(
        organization_id=org.id,
        request_id=request_id,
        evidence_ref=data.evidence_ref,
        api_key_id=api_key.id,
    )
    return request_obj


@router.get("", response_model=List[DataRightRequestResponse])
async def list_rights_requests(
    status: Optional[RequestStatus] = Query(None),
    right: Optional[DataRight] = Query(None),
    limit: int = Query(100, le=1000),
    offset: int = Query(0, ge=0),
    request: Request = None,
    db: Session = Depends(get_db),
    auth: tuple[ApiKey, Organization] = Depends(verify_api_key_auth),
):
    """List data rights requests."""
    api_key, org = auth

    # Rate limit
    await rate_limiter.check_rate_limit(str(api_key.id), request)

    rights_service = RightsService(db)
    requests = rights_service.list_requests(
        organization_id=org.id, status=status, right=right, limit=limit, offset=offset
    )
    return requests


