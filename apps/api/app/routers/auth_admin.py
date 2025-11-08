"""Admin authentication router (API keys, webhooks, purposes, policies)."""
import secrets

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import and_
from sqlalchemy.orm import Session

from apps.api.app.core.config import settings
from apps.api.app.core.ratelimit import optional_rate_limit
from apps.api.app.core.security import encrypt_field, hash_api_key
from apps.api.app.db.session import get_db
from apps.api.app.deps.auth import verify_api_key_auth
from apps.api.app.models.api_key import ApiKey
from apps.api.app.models.organization import Organization
from apps.api.app.models.purpose import Purpose
from apps.api.app.models.webhook import WebhookEndpoint
from apps.api.app.schemas.api_key import ApiKeyCreate, ApiKeyCreateResponse, ApiKeyResponse
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


def generate_api_key() -> str:
    """Generate a new API key."""
    return f"cv_{secrets.token_urlsafe(32)}"


@router.post("/api-keys", response_model=ApiKeyCreateResponse, status_code=status.HTTP_201_CREATED)
async def create_api_key(
    data: ApiKeyCreate,
    db: Session = Depends(get_db),
    auth: tuple[ApiKey, Organization] = Depends(verify_api_key_auth),
):
    """Create a new API key (admin only)."""
    api_key, org = auth
    # For now, all authenticated keys can create API keys
    # In future, check RBAC role == "admin"

    # Generate key
    plaintext_key = generate_api_key()
    hashed_key = hash_api_key(plaintext_key)

    # Generate HMAC secret
    hmac_secret = secrets.token_urlsafe(32)
    encrypted_hmac_secret = encrypt_field(hmac_secret, settings.master_encryption_key)

    db_key = ApiKey(
        organization_id=org.id,
        name=data.name,
        hashed_key=hashed_key,
        hmac_secret=encrypted_hmac_secret,
        active=True,
    )
    db.add(db_key)
    db.commit()
    db.refresh(db_key)

    return ApiKeyCreateResponse(
        id=db_key.id,
        name=db_key.name,
        api_key=plaintext_key,  # Show only once
        created_at=db_key.created_at,
    )


@router.get("/api-keys", response_model=list[ApiKeyResponse])
async def list_api_keys(
    db: Session = Depends(get_db),
    auth: tuple[ApiKey, Organization] = Depends(verify_api_key_auth),
):
    """List API keys (admin only)."""
    api_key, org = auth
    keys = db.query(ApiKey).filter(ApiKey.organization_id == org.id).all()
    return keys


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
    purposes = db.query(Purpose).filter(Purpose.organization_id == org.id).all()
    return purposes


@router.post(
    "/webhooks", response_model=WebhookEndpointResponse, status_code=status.HTTP_201_CREATED
)
async def create_webhook(
    data: WebhookEndpointCreate,
    db: Session = Depends(get_db),
    auth: tuple[ApiKey, Organization] = Depends(verify_api_key_auth),
):
    """Create a webhook endpoint (admin only)."""
    api_key, org = auth
    webhook_service = WebhookService(db)
    endpoint = webhook_service.create_endpoint(org.id, data.url, data.secret)
    return endpoint


@router.get("/webhooks", response_model=list[WebhookEndpointResponse])
async def list_webhooks(
    db: Session = Depends(get_db),
    auth: tuple[ApiKey, Organization] = Depends(verify_api_key_auth),
):
    """List webhook endpoints (admin only)."""
    api_key, org = auth
    webhook_service = WebhookService(db)
    endpoints = webhook_service.list_endpoints(org.id)
    return endpoints


@router.delete("/webhooks/{webhook_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_webhook(
    webhook_id: int,
    db: Session = Depends(get_db),
    auth: tuple[ApiKey, Organization] = Depends(verify_api_key_auth),
):
    """Delete a webhook endpoint (admin only)."""
    api_key, org = auth
    webhook_service = WebhookService(db)
    endpoint = (
        db.query(WebhookEndpoint)
        .filter(
            and_(
                WebhookEndpoint.id == webhook_id,
                WebhookEndpoint.organization_id == org.id,
            )
        )
        .first()
    )
    if not endpoint:
        raise HTTPException(status_code=404, detail="Webhook not found")
    db.delete(endpoint)
    db.commit()
    return None


@router.post("/policies", response_model=PolicyResponse, status_code=status.HTTP_201_CREATED)
async def create_policy(
    data: PolicyCreate,
    db: Session = Depends(get_db),
    auth: tuple[ApiKey, Organization] = Depends(verify_api_key_auth),
):
    """Create or update a retention policy (admin only)."""
    api_key, org = auth
    policy_service = PolicyService(db)
    policy = policy_service.upsert_policy(org.id, data.purpose_id, data.retention_days, data.active)
    return policy


@router.get("/policies", response_model=list[PolicyResponse])
async def list_policies(
    db: Session = Depends(get_db),
    auth: tuple[ApiKey, Organization] = Depends(verify_api_key_auth),
):
    """List retention policies (admin only)."""
    api_key, org = auth
    policy_service = PolicyService(db)
    policies = policy_service.list_policies(org.id)
    return policies

