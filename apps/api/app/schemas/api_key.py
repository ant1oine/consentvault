"""API Key schemas."""
from typing import Optional
from datetime import datetime
from pydantic import BaseModel, ConfigDict


class ApiKeyCreate(BaseModel):
    """
    Payload for creating a new API key.
    - `name`: display name for the key
    - `organization_id`: optional (only SUPERADMIN can specify another org)
    """
    name: str
    organization_id: Optional[int] = None  # SUPERADMIN override


class ApiKeyCreateResponse(BaseModel):
    """Response after creating an API key (shows plaintext key once)."""
    id: int
    name: str
    api_key: str
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class ApiKeyResponse(BaseModel):
    """Full API key details (for list views)."""
    id: int
    organization_id: int
    name: str
    last_used_at: Optional[datetime] = None
    active: bool
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)
