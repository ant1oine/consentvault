"""Data rights schemas."""
from pydantic import BaseModel, Field
from datetime import datetime
from apps.api.app.models.rights import DataRight, RequestStatus


class DataRightRequestCreate(BaseModel):
    """Create data rights request schema."""

    external_user_id: str = Field(..., min_length=1, max_length=255)
    right: DataRight
    reason: str | None = None


class DataRightRequestResponse(BaseModel):
    """Data rights request response schema."""

    id: str
    organization_id: int
    external_user_id: str
    right: DataRight
    status: RequestStatus
    opened_at: datetime
    closed_at: datetime | None
    reason: str | None
    evidence_ref: str | None

    class Config:
        from_attributes = True


class DataRightRequestComplete(BaseModel):
    """Complete data rights request schema."""

    evidence_ref: str = Field(..., min_length=1, max_length=500)


