"""Hashing utilities."""
import hashlib
import json
from typing import Any


def sha256_hash(data: str) -> str:
    """Generate SHA-256 hash of a string."""
    return hashlib.sha256(data.encode()).hexdigest()


def canonical_json_hash(obj: Any) -> str:
    """Generate SHA-256 hash of canonical JSON representation."""
    json_str = json.dumps(obj, sort_keys=True, separators=(",", ":"))
    return sha256_hash(json_str)


def compute_audit_hash(prev_hash: str, event_data: dict[str, Any]) -> str:
    """
    Compute audit log entry hash.

    Hash chain: entry_hash = sha256(prev_hash + canonical_json(event))
    """
    canonical_event = json.dumps(event_data, sort_keys=True, separators=(",", ":"))
    combined = prev_hash + canonical_event
    return sha256_hash(combined)


