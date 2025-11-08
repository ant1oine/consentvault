"""HMAC signing utilities for webhooks."""
import json
import time
from typing import Any

from apps.api.app.core.security import generate_hmac_signature


def sign_webhook_payload(payload: dict[str, Any], secret: str) -> tuple[str, str]:
    """
    Sign a webhook payload and return signature and timestamp.

    Returns:
        Tuple of (signature, timestamp)
    """
    timestamp = str(int(time.time()))
    body_bytes = json.dumps(payload, sort_keys=True).encode()
    signature = generate_hmac_signature(body_bytes, timestamp, secret)
    return signature, timestamp


