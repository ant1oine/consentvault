"""Field-level encryption utilities."""
from typing import Any

from apps.api.app.core.security import decrypt_field, encrypt_field, get_fernet
from apps.api.app.core.config import settings


def encrypt_fields(data: dict[str, Any], encryption_key: str) -> dict[str, Any]:
    """
    Encrypt specified fields in a dictionary.

    Fields to encrypt should be marked or passed separately.
    For now, we encrypt values in encrypted_fields dict.
    """
    if not data or "encrypted_fields" not in data:
        return data

    encrypted = {}
    for key, value in data["encrypted_fields"].items():
        if isinstance(value, str):
            encrypted[key] = encrypt_field(value, encryption_key)
        else:
            encrypted[key] = value

    result = data.copy()
    result["encrypted_fields"] = encrypted
    return result


def decrypt_fields(data: dict[str, Any], encryption_key: str) -> dict[str, Any]:
    """Decrypt encrypted fields in a dictionary."""
    if not data or "encrypted_fields" not in data:
        return data

    decrypted = {}
    for key, value in data["encrypted_fields"].items():
        if isinstance(value, str):
            try:
                decrypted[key] = decrypt_field(value, encryption_key)
            except Exception:
                # If decryption fails, keep encrypted value
                decrypted[key] = value
        else:
            decrypted[key] = value

    result = data.copy()
    result["encrypted_fields"] = decrypted
    return result


