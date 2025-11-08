"""Policy schemas."""
from datetime import datetime

from pydantic import BaseModel, Field


class PolicyCreate(BaseModel):
    """Create/update policy schema."""

    purpose_id: int
    retention_days: int = Field(..., gt=0)
    active: bool = True


class PolicyResponse(BaseModel):
    """Policy response schema."""

    id: int
    organization_id: int
    purpose_id: int
    retention_days: int
    active: bool
    created_at: datetime

    class Config:
        from_attributes = True


