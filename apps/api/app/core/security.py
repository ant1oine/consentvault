"""Security utilities for hashing, encryption, and HMAC."""
import hashlib
import hmac
import os
import time
from datetime import UTC, datetime, timedelta
from typing import Any

from cryptography.fernet import Fernet
from jose import JWTError, jwt
from passlib.context import CryptContext

pwd_context = CryptContext(schemes=["argon2"], deprecated="auto")


def hash_api_key(key: str) -> str:
    """Hash an API key using Argon2."""
    return pwd_context.hash(key)


def verify_api_key(plain_key: str, hashed_key: str) -> bool:
    """Verify an API key against its hash."""
    return pwd_context.verify(plain_key, hashed_key)


def get_fernet(key: str) -> Fernet:
    """Get a Fernet instance from a base64-encoded key."""
    # Fernet key should be URL-safe base64-encoded 32-byte key
    # Use the key directly (Fernet will validate it)
    return Fernet(key.encode())


def encrypt_field(value: str, encryption_key: str) -> str:
    """Encrypt a field value using Fernet."""
    fernet = get_fernet(encryption_key)
    return fernet.encrypt(value.encode()).decode()


def decrypt_field(encrypted_value: str, encryption_key: str) -> str:
    """Decrypt a field value using Fernet."""
    fernet = get_fernet(encryption_key)
    return fernet.decrypt(encrypted_value.encode()).decode()


def hash_with_salt(value: str, salt: str) -> str:
    """Hash a value with a salt using SHA-256."""
    return hashlib.sha256((value + salt).encode()).hexdigest()


def verify_hmac_signature(
    body: bytes, timestamp: str, signature: str, secret: str, max_skew_seconds: int = 300
) -> bool:
    """
    Verify HMAC-SHA256 signature.

    Args:
        body: Request body bytes
        timestamp: X-Timestamp header value
        signature: X-Signature header value
        secret: HMAC secret
        max_skew_seconds: Maximum allowed clock skew (default 5 minutes)

    Returns:
        True if signature is valid and timestamp is within skew window
    """
    try:
        timestamp_int = int(timestamp)
        current_time = int(time.time())
        if abs(current_time - timestamp_int) > max_skew_seconds:
            return False

        message = body + timestamp.encode()
        expected_signature = hmac.new(
            secret.encode(), message, hashlib.sha256
        ).hexdigest()

        return hmac.compare_digest(expected_signature, signature)
    except (ValueError, TypeError):
        return False


def generate_hmac_signature(body: bytes, timestamp: str, secret: str) -> str:
    """Generate HMAC-SHA256 signature for webhook delivery."""
    message = body + timestamp.encode()
    return hmac.new(secret.encode(), message, hashlib.sha256).hexdigest()


# JWT Token Functions
# JWT settings - in production, use a strong secret from environment
JWT_SECRET_KEY = os.getenv("JWT_SECRET_KEY", "your-secret-key-change-in-production")
JWT_ALGORITHM = "HS256"
JWT_ACCESS_TOKEN_EXPIRE_MINUTES = 30


def create_access_token(data: dict[str, Any], expires_delta: timedelta | None = None) -> str:
    """
    Create a JWT access token.

    Args:
        data: Dictionary containing claims (e.g., {"sub": user_id, "email": email})
        expires_delta: Optional expiration time delta

    Returns:
        Encoded JWT token string
    """
    to_encode = data.copy()
    now = datetime.now(UTC)
    if expires_delta:
        expire = now + expires_delta
    else:
        expire = now + timedelta(minutes=JWT_ACCESS_TOKEN_EXPIRE_MINUTES)

    to_encode.update({"exp": expire, "iat": now})
    encoded_jwt = jwt.encode(to_encode, JWT_SECRET_KEY, algorithm=JWT_ALGORITHM)
    return encoded_jwt


def verify_token(token: str) -> dict[str, Any]:
    """
    Verify and decode a JWT token.

    Args:
        token: JWT token string

    Returns:
        Decoded token payload

    Raises:
        JWTError: If token is invalid or expired
    """
    try:
        payload = jwt.decode(token, JWT_SECRET_KEY, algorithms=[JWT_ALGORITHM])
        return payload
    except JWTError:
        raise
