"""Consent router."""
from datetime import UTC, datetime
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, Request, Header, status
from sqlalchemy.orm import Session
from sqlalchemy import or_

from app.db import Consent, Org, User, get_db
from app.deps import get_current_org, get_org_by_api_key, get_current_user_optional, get_current_user
from app.schemas import ConsentCreate, ConsentOut
from app.security import compute_version_hash
from app.security.roles import get_user_org_membership
from app.services.audit_service import log_event

router = APIRouter(prefix="/consents", tags=["Consents"])


@router.post("", response_model=ConsentOut, status_code=status.HTTP_201_CREATED)
def create_consent(
    consent_data: ConsentCreate,
    request: Request = None,
    org: Org = Depends(get_org_by_api_key),
    db: Session = Depends(get_db),
):
    """
    Create consent record (requires API key in Authorization header).
    Automatically attaches org_id from API key.
    """
    # Validate status
    if consent_data.status not in ("granted", "revoked"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Status must be 'granted' or 'revoked'",
        )

    # Get IP and user agent from request
    ip = None
    user_agent = None
    if request:
        if request.client:
            ip = request.client.host
        user_agent = request.headers.get("user-agent")

    # Use provided or request values
    ip = consent_data.ip or ip
    user_agent = consent_data.user_agent or user_agent

    # Default text if not provided
    text = consent_data.text or f"Consent for {consent_data.purpose}"

    # Compute version hash
    version_hash = compute_version_hash(consent_data.purpose, text)

    # Set revoked_at if status is revoked
    revoked_at = datetime.now(UTC) if consent_data.status == "revoked" else None

    consent = Consent(
        org_id=org.id,
        subject_email=consent_data.subject_email,
        purpose=consent_data.purpose,
        text=text,
        version_hash=version_hash,
        ip=ip,
        user_agent=user_agent,
        revoked_at=revoked_at,
        metadata_json=consent_data.metadata or {},
    )

    db.add(consent)
    db.commit()
    db.refresh(consent)

    # Log audit action
    # For API key auth, we use the org as the "actor" context
    log_event(
        db=db,
        actor=org,  # Use org as actor context for API key auth
        action="created",
        entity_type="consent",
        entity_id=consent.id,
        org_id=org.id,
        metadata={
            "subject_email": consent.subject_email,
            "purpose": consent.purpose,
            "status": consent_data.status,
        },
    )

    return consent


@router.get("", response_model=list[ConsentOut])
def list_consents(
    x_api_key: str | None = Header(None, alias="X-API-Key"),
    subject_id: str | None = Query(None),
    subject_email: str | None = Query(None),
    purpose: str | None = Query(None),
    from_date: datetime | None = Query(None),
    to_date: datetime | None = Query(None),
    q: str | None = Query(None),
    current_user: User | None = Depends(get_current_user_optional),
    db: Session = Depends(get_db),
):
    """
    List consents with filters.
    Supports both X-API-Key header (for API integrations) and JWT auth (for dashboard).
    Regular users see consents scoped to their organization.
    """
    # API key authentication (for API integrations)
    if x_api_key:
        org = db.query(Org).filter(Org.api_key == x_api_key).first()
        if not org:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid API key",
            )
        query = db.query(Consent).filter(Consent.org_id == org.id)
    else:
        # JWT authentication (for dashboard)
        if not current_user:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Authentication required (API key or JWT token)",
            )
        
        # Superadmins can view all consents
        if current_user.is_superadmin:
            query = db.query(Consent)
        else:
            # Regular users: scope to their organization
            org_user = get_user_org_membership(current_user, db)
            if not org_user:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="User not part of any organization",
                )
            query = db.query(Consent).filter(Consent.org_id == org_user.org_id)

    if subject_id:
        query = query.filter(Consent.subject_id == subject_id)
    if subject_email:
        query = query.filter(Consent.subject_email == subject_email)
    if purpose:
        query = query.filter(Consent.purpose == purpose)
    if from_date:
        query = query.filter(Consent.accepted_at >= from_date)
    if to_date:
        query = query.filter(Consent.accepted_at <= to_date)
    if q:
        query = query.filter(
            or_(
                Consent.subject_id.ilike(f"%{q}%"),
                Consent.subject_email.ilike(f"%{q}%"),
                Consent.purpose.ilike(f"%{q}%"),
                Consent.text.ilike(f"%{q}%"),
            )
        )

    consents = query.order_by(Consent.accepted_at.desc()).limit(1000).all()
    return consents


@router.post("/{consent_id}/revoke", status_code=status.HTTP_200_OK)
def revoke_consent(
    consent_id: UUID,
    org: Org = Depends(get_org_by_api_key),
    db: Session = Depends(get_db),
):
    """Revoke a consent (requires API key)."""
    consent = db.query(Consent).filter(
        Consent.id == consent_id,
        Consent.org_id == org.id,
    ).first()

    if not consent:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Consent not found",
        )

    if consent.revoked_at:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Consent already revoked",
        )

    consent.revoked_at = datetime.now(UTC)
    db.commit()

    # Log audit action
    # For API key auth, we use the org as the "actor" context
    log_event(
        db=db,
        actor=org,  # Use org as actor context for API key auth
        action="revoked",
        entity_type="consent",
        entity_id=consent.id,
        org_id=org.id,
        metadata={"subject_email": consent.subject_email, "purpose": consent.purpose},
    )

    return {"message": "Consent revoked", "consent_id": str(consent_id)}
