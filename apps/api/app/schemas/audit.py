"""Audit log schemas."""
from pydantic import BaseModel
from datetime import datetime


class AuditLogResponse(BaseModel):
    """Audit log response schema."""

    id: str
    organization_id: int
    actor_api_key_id: int | None
    event_type: str
    object_type: str
    object_id: str
    prev_hash: str
    entry_hash: str
    request_fingerprint: str | None
    created_at: datetime

    class Config:
        from_attributes = True


