"""Data Rights (DSAR) router."""
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.db import DataRightRequest, Org, OrgUser, User, get_db
from app.deps import get_current_org, get_current_user, get_org_by_api_key
from app.schemas import DataRightRequestBase, DataRightRequestOut, DataRightRequestStatusUpdate
from app.services.audit_service import log_action

router = APIRouter(prefix="/v1/data-rights", tags=["Data Rights"])


@router.post("", response_model=DataRightRequestOut, status_code=status.HTTP_201_CREATED)
def create_data_right_request(
    payload: DataRightRequestBase,
    org: Org = Depends(get_org_by_api_key),
    db: Session = Depends(get_db),
):
    """Create a new Data Subject Access Request (DSAR). Requires X-API-Key header."""
    req = DataRightRequest(
        org_id=org.id,
        subject_email=payload.subject_email,
        request_type=payload.request_type,
        notes=payload.notes,
        status="pending",
    )
    db.add(req)
    db.commit()
    db.refresh(req)

    # Log audit action
    log_action(
        org_id=org.id,
        user_email=None,  # API key auth, no user email
        action="submitted",
        entity_type="data_right_request",
        entity_id=req.id,
        metadata={"type": payload.request_type, "subject_email": payload.subject_email},
    )

    return req


@router.get("", response_model=list[DataRightRequestOut])
def list_data_rights(
    org: Org = Depends(get_org_by_api_key),
    db: Session = Depends(get_db),
):
    """
    List Data Rights requests for the organization.
    Requires X-API-Key header for authentication.
    """
    return (
        db.query(DataRightRequest)
        .filter(DataRightRequest.org_id == org.id)
        .order_by(DataRightRequest.created_at.desc())
        .limit(100)
        .all()
    )


@router.post("/{request_id}/status", status_code=status.HTTP_200_OK)
def update_data_right_status(
    request_id: UUID,
    payload: DataRightRequestStatusUpdate,
    org: Org = Depends(get_org_by_api_key),
    db: Session = Depends(get_db),
):
    """Update the status of a Data Rights request. Requires X-API-Key header."""
    req = db.query(DataRightRequest).filter(
        DataRightRequest.id == request_id,
        DataRightRequest.org_id == org.id,
    ).first()
    if not req:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Request not found",
        )

    old_status = req.status
    req.status = payload.status
    req.processed_by = None  # API key auth, no user email
    db.commit()
    db.refresh(req)

    # Log audit action
    log_action(
        org_id=org.id,
        user_email=None,  # API key auth, no user email
        action=f"marked_{payload.status}",
        entity_type="data_right_request",
        entity_id=req.id,
        metadata={"old_status": old_status, "new_status": payload.status},
    )

    return {"message": f"Request {payload.status} successfully.", "request": req}

