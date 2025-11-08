"""Security utilities for hashing, encryption, and HMAC."""
import base64
import hashlib
import hmac
import time
from typing import Optional

from cryptography.fernet import Fernet
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

