"""User schemas."""
from pydantic import BaseModel, EmailStr
from typing import Optional, Literal


class UserBase(BaseModel):
    """Base user schema."""

    email: EmailStr
    display_name: Optional[str] = None
    role: Literal["ADMIN", "AUDITOR", "VIEWER"]
    active: bool = True


class UserCreate(UserBase):
    """Create user schema."""
    pass


class UserUpdateRole(BaseModel):
    """Update user role schema."""

    role: Literal["ADMIN", "AUDITOR", "VIEWER"]


class UserToggleActive(BaseModel):
    """Toggle user active status schema."""

    active: bool


class UserResponse(UserBase):
    """User response schema."""

    id: str
    organization_id: int
    created_at: str
    updated_at: str

    class Config:
        from_attributes = True

