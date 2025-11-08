"""Organizations router for admin management."""
import secrets
from datetime import UTC, datetime

from fastapi import APIRouter, Depends, Request
from sqlalchemy.orm import Session

from apps.api.app.core.config import settings
from apps.api.app.core.ratelimit import optional_rate_limit
from apps.api.app.core.security import encrypt_field, hash_api_key
from apps.api.app.db.session import get_db
from apps.api.app.deps.auth import verify_api_key_auth
from apps.api.app.models.api_key import ApiKey, ApiKeyRole
from apps.api.app.models.organization import DataRegion, Organization, OrganizationStatus
from apps.api.app.schemas.organization import (
    OrganizationCreate,
    OrganizationCreateResponse,
    OrganizationResponse,
)
from apps.api.app.services.audit import AuditService

router = APIRouter(
    prefix="/v1/admin/organizations",
    tags=["admin"],
    dependencies=[optional_rate_limit(times=60, seconds=60)],
)


def create_organization_with_key(
    db: Session,
    name: str,
    data_region: DataRegion,
    api_key_name: str = "Admin Key",
) -> tuple[Organization, str, str]:
    """
    Create an organization with an automatically generated API key and HMAC secret.

    Returns:
        Tuple of (Organization, plaintext_api_key, plaintext_hmac_secret)
    """
    # Create organization
    org = Organization(
        name=name,
        data_region=data_region,
        status=OrganizationStatus.ACTIVE,
    )
    db.add(org)
    db.commit()
    db.refresh(org)

    # Generate API key
    plaintext_key = f"cv_{secrets.token_urlsafe(32)}"
    hashed_key = hash_api_key(plaintext_key)

    # Generate HMAC secret
    hmac_secret = secrets.token_urlsafe(32)
    encrypted_hmac_secret = encrypt_field(hmac_secret, settings.master_encryption_key)

    # Create API key
    api_key = ApiKey(
        organization_id=org.id,
        name=api_key_name,
        hashed_key=hashed_key,
        hmac_secret=encrypted_hmac_secret,
        active=True,
        role=ApiKeyRole.ADMIN,
    )
    db.add(api_key)
    db.commit()
    db.refresh(api_key)

    return org, plaintext_key, hmac_secret


@router.get("", response_model=list[OrganizationResponse])
async def list_organizations(
    db: Session = Depends(get_db),
    auth: tuple[ApiKey, Organization] = Depends(verify_api_key_auth),
):
    """List all organizations (admin only)."""
    api_key, org = auth
    # For now, all authenticated keys can list organizations
    # In future, check RBAC role == "admin"

    organizations = db.query(Organization).filter(
        Organization.status != OrganizationStatus.DELETED
    ).all()

    return [
        OrganizationResponse(
            id=org.id,
            name=org.name,
            data_region=org.data_region,
            status=org.status.value,
            created_at=org.created_at.isoformat(),
        )
        for org in organizations
    ]


@router.post("", response_model=OrganizationCreateResponse, status_code=201)
async def create_organization(
    data: OrganizationCreate,
    request: Request,
    db: Session = Depends(get_db),
    auth: tuple[ApiKey, Organization] = Depends(verify_api_key_auth),
):
    """Create a new organization with API key and HMAC secret (admin only)."""
    api_key, auth_org = auth
    # For now, all authenticated keys can create organizations
    # In future, check RBAC role == "admin"

    # Create organization with key
    org, plaintext_api_key, plaintext_hmac_secret = create_organization_with_key(
        db=db,
        name=data.name,
        data_region=data.data_region,
    )

    # Log audit event
    audit_service = AuditService(db)
    prev_hash = audit_service.get_latest_hash(org.id)

    event_time = datetime.now(UTC)
    event_data = {
        "event_type": "organization.created",
        "object_type": "organization",
        "object_id": str(org.id),
        "organization_id": org.id,
        "name": org.name,
        "data_region": org.data_region.value,
        "created_by_api_key_id": api_key.id,
        "timestamp": event_time.isoformat(),
    }
    entry_hash = audit_service.compute_hash(prev_hash, event_data)

    # Get request fingerprint (simplified)
    request_fingerprint = None
    if request.client:
        request_fingerprint = f"{request.client.host}:{request.headers.get('user-agent', '')}"

    audit_service.log_event(
        organization_id=org.id,
        actor_api_key_id=api_key.id,
        event_type="organization.created",
        object_type="organization",
        object_id=str(org.id),
        prev_hash=prev_hash,
        entry_hash=entry_hash,
        request_fingerprint=request_fingerprint,
    )

    return OrganizationCreateResponse(
        organization=OrganizationResponse(
            id=org.id,
            name=org.name,
            data_region=org.data_region,
            status=org.status.value,
            created_at=org.created_at.isoformat(),
        ),
        api_key=plaintext_api_key,
        hmac_secret=plaintext_hmac_secret,
    )
