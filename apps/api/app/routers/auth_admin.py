"""Admin router — manages organizations, API keys, webhooks, purposes, and policies."""
import secrets
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import and_
from sqlalchemy.orm import Session

from apps.api.app.core.config import settings
from apps.api.app.core.ratelimit import optional_rate_limit
from apps.api.app.core.security import encrypt_field, hash_api_key
from apps.api.app.db.session import get_db
from apps.api.app.deps.auth import verify_api_key_auth
from apps.api.app.models.api_key import ApiKey, ApiKeyRole
from apps.api.app.models.organization import Organization
from apps.api.app.models.purpose import Purpose
from apps.api.app.models.webhook import WebhookEndpoint
from apps.api.app.schemas.api_key import ApiKeyCreate, ApiKeyCreateResponse, ApiKeyResponse
from apps.api.app.schemas.organization import OrganizationResponse
from apps.api.app.schemas.policy import PolicyCreate, PolicyResponse
from apps.api.app.schemas.purpose import PurposeCreate, PurposeResponse
from apps.api.app.schemas.webhook import WebhookEndpointCreate, WebhookEndpointResponse
from apps.api.app.services.policy import PolicyService
from apps.api.app.services.webhook import WebhookService

router = APIRouter(
    prefix="/v1/admin",
    tags=["admin"],
    dependencies=[optional_rate_limit(times=60, seconds=60)],
)

# ------------------------------------------------------------
# Helper
# ------------------------------------------------------------
def generate_api_key() -> str:
    """Generate a new API key."""
    return f"cv_{secrets.token_urlsafe(32)}"


# ------------------------------------------------------------
# ORGANIZATIONS
# ------------------------------------------------------------
@router.get("/organizations", response_model=list[OrganizationResponse])
async def list_organizations(
    db: Session = Depends(get_db),
    auth: tuple[ApiKey, Organization] = Depends(verify_api_key_auth),
):
    """
    List organizations.
    - SUPERADMIN: sees all organizations
    - Others: sees only their own organization
    """
    api_key, org = auth
    if api_key.role == ApiKeyRole.SUPERADMIN:
        return db.query(Organization).all()
    return [org]


@router.post(
    "/organizations",
    response_model=OrganizationResponse,
    status_code=status.HTTP_201_CREATED,
)
async def create_organization(
    data: dict,
    db: Session = Depends(get_db),
    auth: tuple[ApiKey, Organization] = Depends(verify_api_key_auth),
):
    """Create a new organization (SUPERADMIN only)."""
    api_key, org = auth

    if api_key.role != ApiKeyRole.SUPERADMIN:
        raise HTTPException(status_code=403, detail="Only superadmins can create organizations")

    new_org = Organization(
        name=data["name"],
        data_region=data["data_region"],
        status="active",
    )
    db.add(new_org)
    db.commit()
    db.refresh(new_org)
    return new_org


# ------------------------------------------------------------
# API KEYS
# ------------------------------------------------------------
@router.post(
    "/api-keys",
    response_model=ApiKeyCreateResponse,
    status_code=status.HTTP_201_CREATED,
)
async def create_api_key(
    data: ApiKeyCreate,
    db: Session = Depends(get_db),
    auth: tuple[ApiKey, Organization] = Depends(verify_api_key_auth),
):
    """
    Create a new API key.
    - SUPERADMIN: can create keys for any organization (via organization_id)
    - ADMIN: can create keys only for their own organization
    """
    api_key, org = auth

    target_org_id = getattr(data, "organization_id", org.id)
    if api_key.role != ApiKeyRole.SUPERADMIN and target_org_id != org.id:
        raise HTTPException(
            status_code=403,
            detail="Not authorized to create API key for another organization",
        )

    plaintext_key = generate_api_key()
    hashed_key = hash_api_key(plaintext_key)
    hmac_secret = secrets.token_urlsafe(32)
    encrypted_hmac_secret = encrypt_field(hmac_secret, settings.master_encryption_key)

    db_key = ApiKey(
        organization_id=target_org_id,
        name=data.name,
        hashed_key=hashed_key,
        hmac_secret=encrypted_hmac_secret,
        role=ApiKeyRole.ADMIN,
        active=True,
    )
    db.add(db_key)
    db.commit()
    db.refresh(db_key)

    return ApiKeyCreateResponse(
        id=db_key.id,
        name=db_key.name,
        api_key=plaintext_key,
        created_at=db_key.created_at,
    )


@router.get("/api-keys", response_model=list[ApiKeyResponse])
async def list_api_keys(
    db: Session = Depends(get_db),
    auth: tuple[ApiKey, Organization] = Depends(verify_api_key_auth),
):
    """List API keys for the current organization."""
    api_key, org = auth
    return db.query(ApiKey).filter(ApiKey.organization_id == org.id).all()


# ------------------------------------------------------------
# PURPOSES
# ------------------------------------------------------------
@router.post("/purposes", response_model=PurposeResponse, status_code=status.HTTP_201_CREATED)
async def create_purpose(
    data: PurposeCreate,
    db: Session = Depends(get_db),
    auth: tuple[ApiKey, Organization] = Depends(verify_api_key_auth),
):
    """Create a purpose (admin only)."""
    api_key, org = auth

    purpose = Purpose(
        organization_id=org.id,
        code=data.code,
        description=data.description,
        active=True,
    )
    db.add(purpose)
    db.commit()
    db.refresh(purpose)
    return purpose


@router.get("/purposes", response_model=list[PurposeResponse])
async def list_purposes(
    db: Session = Depends(get_db),
    auth: tuple[ApiKey, Organization] = Depends(verify_api_key_auth),
):
    """List purposes (admin only)."""
    api_key, org = auth
    return db.query(Purpose).filter(Purpose.organization_id == org.id).all()


# ------------------------------------------------------------
# WEBHOOKS
# ------------------------------------------------------------
@router.post("/webhooks", response_model=WebhookEndpointResponse, status_code=status.HTTP_201_CREATED)
async def create_webhook(
    data: WebhookEndpointCreate,
    db: Session = Depends(get_db),
    auth: tuple[ApiKey, Organization] = Depends(verify_api_key_auth),
):
    """Create a webhook endpoint (admin only)."""
    api_key, org = auth
    service = WebhookService(db)
    return service.create_endpoint(org.id, data.url, data.secret)


@router.get("/webhooks", response_model=list[WebhookEndpointResponse])
async def list_webhooks(
    db: Session = Depends(get_db),
    auth: tuple[ApiKey, Organization] = Depends(verify_api_key_auth),
):
    """List webhook endpoints (admin only)."""
    api_key, org = auth
    service = WebhookService(db)
    return service.list_endpoints(org.id)


@router.delete("/webhooks/{webhook_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_webhook(
    webhook_id: int,
    db: Session = Depends(get_db),
    auth: tuple[ApiKey, Organization] = Depends(verify_api_key_auth),
):
    """Delete a webhook endpoint (admin only)."""
    api_key, org = auth
    endpoint = (
        db.query(WebhookEndpoint)
        .filter(and_(WebhookEndpoint.id == webhook_id, WebhookEndpoint.organization_id == org.id))
        .first()
    )
    if not endpoint:
        raise HTTPException(status_code=404, detail="Webhook not found")
    db.delete(endpoint)
    db.commit()
    return None


# ------------------------------------------------------------
# POLICIES
# ------------------------------------------------------------
@router.post("/policies", response_model=PolicyResponse, status_code=status.HTTP_201_CREATED)
async def create_policy(
    data: PolicyCreate,
    db: Session = Depends(get_db),
    auth: tuple[ApiKey, Organization] = Depends(verify_api_key_auth),
):
    """Create or update a retention policy (admin only)."""
    api_key, org = auth
    service = PolicyService(db)
    return service.upsert_policy(org.id, data.purpose_id, data.retention_days, data.active)


@router.get("/policies", response_model=list[PolicyResponse])
async def list_policies(
    db: Session = Depends(get_db),
    auth: tuple[ApiKey, Organization] = Depends(verify_api_key_auth),
):
    """List retention policies (admin only)."""
    api_key, org = auth
    service = PolicyService(db)
    return service.list_policies(org.id)
