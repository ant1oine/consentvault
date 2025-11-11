"""Security utilities for password hashing and JWT tokens."""
import hashlib
from datetime import UTC, datetime, timedelta
from typing import Any

from jose import JWTError, jwt
from passlib.context import CryptContext

from app.config import settings

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

JWT_ALGORITHM = "HS256"
JWT_ACCESS_TOKEN_EXPIRE_MINUTES = 30
# Extended expiration for better UX (7 days)
JWT_ACCESS_TOKEN_EXPIRE_DAYS = 7


def hash_password(password: str) -> str:
    """Hash a password using bcrypt."""
    return pwd_context.hash(password)


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify a password against its hash."""
    return pwd_context.verify(plain_password, hashed_password)


def create_access_token(data: dict[str, Any], expires_delta: timedelta | None = None) -> str:
    """Create a JWT access token."""
    to_encode = data.copy()
    now = datetime.now(UTC)
    if expires_delta:
        expire = now + expires_delta
    else:
        # Default to 7 days for better UX
        expire = now + timedelta(days=JWT_ACCESS_TOKEN_EXPIRE_DAYS)

    to_encode.update({"exp": expire, "iat": now})
    encoded_jwt = jwt.encode(to_encode, settings.jwt_key, algorithm=JWT_ALGORITHM)
    return encoded_jwt


def decode_token_safely(token: str) -> dict[str, Any] | None:
    """Safely decode a JWT token, returning None if invalid or expired."""
    try:
        payload = jwt.decode(token, settings.jwt_key, algorithms=[JWT_ALGORITHM])
        return payload
    except jwt.ExpiredSignatureError:
        # Token expired - return None instead of raising
        return None
    except JWTError:
        # Invalid token - return None instead of raising
        return None


def verify_token(token: str) -> dict[str, Any]:
    """Verify and decode a JWT token. Raises exception on error."""
    try:
        payload = jwt.decode(token, settings.jwt_key, algorithms=[JWT_ALGORITHM])
        return payload
    except jwt.ExpiredSignatureError:
        raise ValueError("JWT token has expired")
    except JWTError as e:
        raise ValueError(f"Invalid JWT token: {str(e)}")


def compute_version_hash(purpose: str, text: str) -> str:
    """Compute version hash for consent text."""
    return hashlib.sha256(f"{purpose}:{text}".encode()).hexdigest()

