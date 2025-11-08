"""Organization schemas."""
from pydantic import BaseModel, Field

from apps.api.app.models.organization import DataRegion


class OrganizationCreate(BaseModel):
    """Create organization schema."""

    name: str = Field(..., min_length=1, max_length=255)
    data_region: DataRegion = DataRegion.KSA


class OrganizationResponse(BaseModel):
    """Organization response schema."""

    id: int
    name: str
    data_region: DataRegion
    status: str
    created_at: str

    class Config:
        from_attributes = True


class OrganizationCreateResponse(BaseModel):
    """Organization creation response with API key and HMAC secret."""

    organization: OrganizationResponse
    api_key: str  # Plaintext - shown only once
    hmac_secret: str  # Plaintext - shown only once


