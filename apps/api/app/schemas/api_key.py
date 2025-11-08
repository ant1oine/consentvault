"""API Key schemas."""
from pydantic import BaseModel, Field
from datetime import datetime


class ApiKeyCreate(BaseModel):
    """Create API key schema."""

    name: str = Field(..., min_length=1, max_length=255)


class ApiKeyResponse(BaseModel):
    """API key response schema (masked)."""

    id: int
    organization_id: int
    name: str
    last_used_at: datetime | None
    active: bool
    created_at: datetime

    class Config:
        from_attributes = True


class ApiKeyCreateResponse(BaseModel):
    """API key creation response with plaintext key (shown once)."""

    id: int
    name: str
    api_key: str  # Plaintext - shown only once
    created_at: datetime


