"""System schemas."""
from pydantic import BaseModel, Field
from datetime import datetime


class SystemCreate(BaseModel):
    """Create system schema."""

    code: str = Field(..., min_length=1, max_length=100)
    description: str | None = Field(None, max_length=500)


class SystemResponse(BaseModel):
    """System response schema."""

    id: int
    organization_id: int
    code: str
    description: str | None
    created_at: datetime

    class Config:
        from_attributes = True


