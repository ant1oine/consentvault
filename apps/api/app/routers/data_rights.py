"""Data Rights (DSAR) router."""
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, Header, status
from sqlalchemy.orm import Session

from app.db import DataRightRequest, Org, OrgUser, User, get_db
from app.deps import get_current_org, get_current_user, get_org_by_api_key, get_current_user_optional
from app.schemas import DataRightRequestBase, DataRightRequestOut, DataRightRequestStatusUpdate
from app.services.audit_service import log_event

router = APIRouter(prefix="/data-rights", tags=["Data Rights"])


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
    # For API key auth, we use the org as the "actor" context
    log_event(
        db=db,
        actor=org,  # Use org as actor context for API key auth
        action="submitted",
        entity_type="data_right_request",
        entity_id=req.id,
        org_id=org.id,
        metadata={"type": payload.request_type, "subject_email": payload.subject_email},
    )

    return req


@router.get("", response_model=list[DataRightRequestOut])
def list_data_rights(
    x_api_key: str | None = Header(None, alias="X-API-Key"),
    org_id: UUID | None = Query(None, description="Organization ID (optional for superadmins with JWT)"),
    current_user: User | None = Depends(get_current_user_optional),
    db: Session = Depends(get_db),
):
    """
    List Data Rights requests for the organization.
    Supports both X-API-Key header (for API integrations) and JWT auth (for dashboard).
    Superadmins can view all requests without org_id.
    Regular users see requests scoped to their organization.
    """
    from app.security.roles import get_user_org_membership
    
    # API key authentication (for API integrations)
    if x_api_key:
        org = db.query(Org).filter(Org.api_key == x_api_key).first()
        if not org:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid API key",
            )
        return (
            db.query(DataRightRequest)
            .filter(DataRightRequest.org_id == org.id)
            .order_by(DataRightRequest.created_at.desc())
            .limit(100)
            .all()
        )
    
    # JWT authentication (for dashboard)
    if not current_user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required (API key or JWT token)",
        )
    
    query = db.query(DataRightRequest).order_by(DataRightRequest.created_at.desc())
    
    # Superadmins can view all requests
    if current_user.is_superadmin:
        if org_id:
            # Superadmin can filter by specific org if requested
            query = query.filter(DataRightRequest.org_id == org_id)
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
            query = query.filter(DataRightRequest.org_id == org_id)
        else:
            # Auto-scope to user's org
            query = query.filter(DataRightRequest.org_id == org_user.org_id)
    
    return query.limit(100).all()


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
    # For API key auth, we use the org as the "actor" context
    log_event(
        db=db,
        actor=org,  # Use org as actor context for API key auth
        action=f"marked_{payload.status}",
        entity_type="data_right_request",
        entity_id=req.id,
        org_id=org.id,
        metadata={"old_status": old_status, "new_status": payload.status},
    )

    return {"message": f"Request {payload.status} successfully.", "request": req}

