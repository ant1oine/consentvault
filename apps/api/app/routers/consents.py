"""Consent router."""
from datetime import datetime
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from sqlalchemy.orm import Session
from sqlalchemy import or_

from app.db import Consent, Org, get_db
from app.deps import get_current_org, require_role
from app.schemas import ConsentCreate, ConsentOut
from app.security import compute_version_hash

router = APIRouter(prefix="/consents", tags=["Consents"])


@router.post("", response_model=ConsentOut, status_code=status.HTTP_201_CREATED)
def create_consent(
    consent_data: ConsentCreate,
    org_id: UUID = Query(..., alias="org_id"),
    request: Request = None,
    db: Session = Depends(get_db),
):
    """
    Create consent record (public endpoint, but requires org_id).
    For widget usage, org_id can be in query param or embedded in signed token.
    """
    # Verify org exists
    org = db.query(Org).filter(Org.id == org_id).first()
    if not org:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Organization not found",
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

    # Compute version hash
    version_hash = compute_version_hash(consent_data.purpose, consent_data.text)

    consent = Consent(
        org_id=org_id,
        subject_id=consent_data.subject_id,
        purpose=consent_data.purpose,
        text=consent_data.text,
        version_hash=version_hash,
        ip=ip,
        user_agent=user_agent,
        metadata_json=consent_data.metadata or {},
    )

    db.add(consent)
    db.commit()
    db.refresh(consent)

    return consent


@router.get("", response_model=list[ConsentOut])
def list_consents(
    org_id: UUID = Query(...),
    subject_id: str | None = Query(None),
    purpose: str | None = Query(None),
    from_date: datetime | None = Query(None),
    to_date: datetime | None = Query(None),
    q: str | None = Query(None),
    current_org: Org = Depends(get_current_org),
    _membership = Depends(require_role("viewer")),
    db: Session = Depends(get_db),
):
    """List consents with filters (viewer+)."""
    query = db.query(Consent).filter(Consent.org_id == current_org.id)

    if subject_id:
        query = query.filter(Consent.subject_id == subject_id)
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
                Consent.purpose.ilike(f"%{q}%"),
                Consent.text.ilike(f"%{q}%"),
            )
        )

    consents = query.order_by(Consent.accepted_at.desc()).limit(1000).all()
    return consents


@router.post("/{consent_id}/revoke", status_code=status.HTTP_200_OK)
def revoke_consent(
    consent_id: UUID,
    current_org: Org = Depends(get_current_org),
    _membership = Depends(require_role("manager")),
    db: Session = Depends(get_db),
):
    """Revoke a consent (manager+)."""
    consent = db.query(Consent).filter(
        Consent.id == consent_id,
        Consent.org_id == current_org.id,
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

    consent.revoked_at = datetime.utcnow()
    db.commit()

    return {"message": "Consent revoked", "consent_id": str(consent_id)}
