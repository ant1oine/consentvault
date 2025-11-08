"""Authentication dependencies."""
import secrets
from typing import Optional
from datetime import datetime

from fastapi import Header, Request, Depends
from sqlalchemy.orm import Session

from apps.api.app.core.config import settings
from apps.api.app.core.security import verify_api_key, verify_hmac_signature, decrypt_field
from apps.api.app.core.errors import UnauthorizedError, ForbiddenError
from apps.api.app.db.session import get_db
from apps.api.app.models.api_key import ApiKey
from apps.api.app.models.organization import Organization, OrganizationStatus


def get_api_key_from_header(x_api_key: Optional[str] = Header(None, alias="X-Api-Key")) -> str:
    """Extract API key from header."""
    if not x_api_key:
        raise UnauthorizedError("Missing X-Api-Key header")
    return x_api_key


async def verify_api_key_auth(
    request: Request,
    api_key: str = Header(None, alias="X-Api-Key"),
    x_signature: Optional[str] = Header(None, alias="X-Signature"),
    x_timestamp: Optional[str] = Header(None, alias="X-Timestamp"),
    db: Session = Depends(get_db),
) -> tuple[ApiKey, Organization]:
    """
    Verify API key authentication and optional HMAC signature.

    Returns:
        Tuple of (ApiKey, Organization)
    """

    if not api_key:
        raise UnauthorizedError("Missing X-Api-Key header")

    # Find API key by checking hash against all active keys
    # In production, you might want to index by a key prefix for faster lookup
    api_keys = db.query(ApiKey).filter(ApiKey.active == True).all()

    matched_key = None
    for key in api_keys:
        if verify_api_key(api_key, key.hashed_key):
            matched_key = key
            break

    if not matched_key:
        raise UnauthorizedError("Invalid API key")

    # Update last used timestamp
    matched_key.last_used_at = datetime.utcnow()
    db.commit()

    # Get organization
    org = db.query(Organization).filter(Organization.id == matched_key.organization_id).first()
    if not org or org.status != OrganizationStatus.ACTIVE:
        raise ForbiddenError("Organization is not active")

    # Optional HMAC verification
    if settings.enable_hmac_verification and x_signature:
        if not x_timestamp:
            raise UnauthorizedError("X-Timestamp required when X-Signature is provided")

        # Decrypt HMAC secret
        hmac_secret = decrypt_field(matched_key.hmac_secret, settings.master_encryption_key)

        # Get request body
        body = await request.body()

        if not verify_hmac_signature(body, x_timestamp, x_signature, hmac_secret):
            raise UnauthorizedError("Invalid HMAC signature")

    return matched_key, org


def require_role(required_role: str):
    """Dependency factory for RBAC (for future use with user tokens)."""
    # For now, API keys don't have roles - all authenticated keys can access developer endpoints
    # Admin endpoints are gated separately
    def role_checker(api_key: ApiKey = None):
        # Placeholder for future RBAC implementation
        return True

    return role_checker

