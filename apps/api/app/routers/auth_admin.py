"""Admin authentication router (API keys, webhooks, purposes, policies)."""
import secrets
from typing import List

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from apps.api.app.db.session import get_db
from apps.api.app.deps.auth import verify_api_key_auth
from apps.api.app.models.api_key import ApiKey
from apps.api.app.models.organization import Organization
from apps.api.app.models.purpose import Purpose
from apps.api.app.models.webhook import WebhookEndpoint
from apps.api.app.models.policy import Policy
from apps.api.app.schemas.api_key import ApiKeyCreate, ApiKeyResponse, ApiKeyCreateResponse
from apps.api.app.schemas.purpose import PurposeCreate, PurposeResponse
from apps.api.app.schemas.webhook import WebhookEndpointCreate, WebhookEndpointResponse
from apps.api.app.schemas.policy import PolicyCreate, PolicyResponse
from apps.api.app.core.security import hash_api_key, encrypt_field
from apps.api.app.core.config import settings
from apps.api.app.services.webhook import WebhookService
from apps.api.app.services.policy import PolicyService

router = APIRouter(prefix="/v1/admin", tags=["admin"])


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


@router.get("/api-keys", response_model=List[ApiKeyResponse])
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


@router.get("/purposes", response_model=List[PurposeResponse])
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


@router.get("/webhooks", response_model=List[WebhookEndpointResponse])
async def list_webhooks(
    db: Session = Depends(get_db),
    auth: tuple[ApiKey, Organization] = Depends(verify_api_key_auth),
):
    """List webhook endpoints (admin only)."""
    api_key, org = auth
    webhook_service = WebhookService(db)
    endpoints = webhook_service.list_endpoints(org.id)
    return endpoints


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


@router.get("/policies", response_model=List[PolicyResponse])
async def list_policies(
    db: Session = Depends(get_db),
    auth: tuple[ApiKey, Organization] = Depends(verify_api_key_auth),
):
    """List retention policies (admin only)."""
    api_key, org = auth
    policy_service = PolicyService(db)
    policies = policy_service.list_policies(org.id)
    return policies


