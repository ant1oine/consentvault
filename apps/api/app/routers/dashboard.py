"""Dashboard router."""
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.db import Consent, Org, OrgMember, get_db
from app.schemas import DashboardSummary

router = APIRouter(prefix="/v1/dashboard", tags=["Dashboard"])


@router.get("/summary", response_model=DashboardSummary)
def get_dashboard_summary(
    org_id: UUID = Query(..., description="Organization ID"),
    db: Session = Depends(get_db),
):
    """Get dashboard summary for an organization."""
    # Verify org exists
    org = db.query(Org).filter(Org.id == org_id).first()
    if not org:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Organization not found",
        )

    # Count active consents (not revoked)
    consents_active = (
        db.query(func.count(Consent.id))
        .filter(Consent.org_id == org_id, Consent.revoked_at.is_(None))
        .scalar()
        or 0
    )

    # Count revocations
    revocations = (
        db.query(func.count(Consent.id))
        .filter(Consent.org_id == org_id, Consent.revoked_at.isnot(None))
        .scalar()
        or 0
    )

    # For now, DSAR completed is same as revocations (since we don't have a DSAR model yet)
    # This can be updated when DSAR model is added
    dsar_completed = revocations

    return DashboardSummary(
        org=org.name,
        consents_active=consents_active,
        revocations=revocations,
        dsar_completed=dsar_completed,
    )

