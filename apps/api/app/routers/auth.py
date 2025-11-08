"""Authentication router for user login/logout with JWT tokens."""
from datetime import timedelta

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from sqlalchemy.orm import Session

from apps.api.app.core.errors import UnauthorizedError
from apps.api.app.core.rate_limit import get_redis
from apps.api.app.core.security import create_access_token, verify_token
from apps.api.app.db.session import get_db
from apps.api.app.models.user import User

router = APIRouter(prefix="/auth", tags=["Auth"])

# OAuth2 scheme for token extraction
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login")

# Redis client for token blacklisting (use db=1 to separate from rate limiting)
def get_redis_blacklist():
    """Get Redis client for token blacklisting."""
    r = get_redis()
    # Use a different database index for blacklist
    # Note: Redis URL might already specify db, so we'll use a key prefix instead
    return r


@router.post("/login")
def login(
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: Session = Depends(get_db),
):
    """
    Authenticate user and return JWT access token.

    Note: For now, this accepts email as username and a simple password.
    In production, implement proper password hashing and verification.
    """
    # Find user by email (form_data.username is the email in OAuth2PasswordRequestForm)
    user = db.query(User).filter(User.email == form_data.username.lower().strip()).first()

    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    if not user.active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User account is inactive",
        )

    # TODO: Implement proper password verification
    # For now, accept any password if user exists and is active
    # In production, add password field to User model and verify with pwd_context.verify()
    # if not pwd_context.verify(form_data.password, user.hashed_password):
    #     raise HTTPException(...)

    # Create access token
    access_token_expires = timedelta(minutes=30)
    access_token = create_access_token(
        data={"sub": user.id, "email": user.email, "role": user.role.value},
        expires_delta=access_token_expires,
    )

    return {
        "access_token": access_token,
        "token_type": "bearer",
        "expires_in": int(access_token_expires.total_seconds()),
    }


@router.post("/logout")
def logout(
    token: str = Depends(oauth2_scheme),
    db: Session = Depends(get_db),
):
    """
    Invalidate the current JWT token by blacklisting it in Redis.

    The token will be rejected for all subsequent requests until it expires naturally.
    """
    if not token:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No active session",
        )

    # Verify token is valid before blacklisting
    try:
        payload = verify_token(token)
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token",
        )

    # Blacklist token in Redis (expires in 1 hour or token expiration, whichever is longer)
    # Get token expiration from payload
    exp = payload.get("exp", 0)
    current_time = int(__import__("time").time())
    ttl = max(3600, exp - current_time)  # At least 1 hour, or until token expires

    r = get_redis_blacklist()
    r.setex(f"blacklist:{token}", ttl, "revoked")

    return {"message": "Logged out successfully"}


# Export oauth2_scheme for use in other modules
__all__ = ["oauth2_scheme", "get_current_user_from_token"]

# Dependency to get current user from JWT token
def get_current_user_from_token(
    token: str = Depends(oauth2_scheme),
    db: Session = Depends(get_db),
) -> User:
    """
    Dependency to get current authenticated user from JWT token.

    Verifies token, checks blacklist, and returns User object.

    Usage in other routers:
        from apps.api.app.routers.auth import get_current_user_from_token

        @router.get("/protected")
        def protected_route(current_user: User = Depends(get_current_user_from_token)):
            ...
    """
    # Verify token
    try:
        payload = verify_token(token)
    except Exception as e:
        raise UnauthorizedError(f"Invalid token: {str(e)}")

    # Check if token is blacklisted
    r = get_redis_blacklist()
    if r.exists(f"blacklist:{token}"):
        raise UnauthorizedError("Token has been revoked")

    # Extract user ID from token
    user_id: str | None = payload.get("sub")
    if user_id is None:
        raise UnauthorizedError("Token missing user ID")

    # Load user from database
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise UnauthorizedError("User not found")

    if not user.active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User account is inactive",
        )

    return user


@router.get("/me")
def get_current_user_info(
    current_user: User = Depends(get_current_user_from_token),
):
    """
    Get current authenticated user information.

    This endpoint requires a valid JWT token in the Authorization header.
    """
    return {
        "id": current_user.id,
        "email": current_user.email,
        "display_name": current_user.display_name,
        "role": current_user.role.value,
        "organization_id": current_user.organization_id,
        "active": current_user.active,
    }

