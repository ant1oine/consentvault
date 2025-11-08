"""Authentication dependencies."""
from datetime import UTC, datetime

from fastapi import Depends, Header, Request
from sqlalchemy.orm import Session

from apps.api.app.core.config import settings
from apps.api.app.core.errors import ForbiddenError, UnauthorizedError
from apps.api.app.core.security import decrypt_field, verify_api_key, verify_hmac_signature
from apps.api.app.db.session import get_db
from apps.api.app.models.api_key import ApiKey
from apps.api.app.models.organization import Organization, OrganizationStatus


def get_api_key_from_header(x_api_key: str | None = Header(None, alias="X-Api-Key")) -> str:
    """Extract API key from header."""
    if not x_api_key:
        raise UnauthorizedError("Missing X-Api-Key header")
    return x_api_key


async def verify_api_key_auth(
    request: Request,
    api_key: str = Header(None, alias="X-Api-Key"),
    x_signature: str | None = Header(None, alias="X-Signature"),
    x_timestamp: str | None = Header(None, alias="X-Timestamp"),
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
    api_keys = db.query(ApiKey).filter(ApiKey.active).all()

    matched_key = None
    for key in api_keys:
        if verify_api_key(api_key, key.hashed_key):
            matched_key = key
            break

    if not matched_key:
        raise UnauthorizedError("Invalid API key")

    # Update last used timestamp
    matched_key.last_used_at = datetime.now(UTC)
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


# JWT-based user authentication
# Import from auth router (no circular dependency since auth router doesn't import this module)
# This allows other routers to use: from apps.api.app.deps.auth import get_current_user
# Note: This will be available after the auth router module is loaded
try:
    from apps.api.app.routers.auth import get_current_user_from_token

    # Alias for convenience (matches user's request)
    # This is the same function, just with a shorter name for convenience
    get_current_user = get_current_user_from_token
except ImportError:
    # Fallback if auth router not yet loaded - will raise error when used
    def get_current_user(*args, **kwargs):
        """
        Get current authenticated user from JWT token.

        This is an alias for get_current_user_from_token from the auth router.
        Verifies token, checks blacklist, and returns User object.

        Usage:
            from apps.api.app.deps.auth import get_current_user
            from apps.api.app.models.user import User

            @router.get("/protected")
            def protected_route(current_user: User = Depends(get_current_user)):
                ...
        """
        raise ImportError(
            "Auth router not available. "
            "Import get_current_user_from_token directly from apps.api.app.routers.auth"
        )
