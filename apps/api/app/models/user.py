"""User model."""
import enum

from sqlalchemy import (
    Boolean,
    Column,
    DateTime,
    Enum,
    ForeignKey,
    Integer,
    String,
    UniqueConstraint,
    func,
)
from sqlalchemy.orm import relationship

from apps.api.app.db.base import Base


class UserRole(str, enum.Enum):
    """User role enum."""

    ADMIN = "ADMIN"
    AUDITOR = "AUDITOR"
    VIEWER = "VIEWER"


class User(Base):
    """User model for organization-scoped users."""

    __tablename__ = "users"

    id = Column(String(26), primary_key=True)
    organization_id = Column(Integer, ForeignKey("organizations.id"), nullable=False)
    email = Column(String(255), nullable=False)
    display_name = Column(String(255), nullable=True)
    role = Column(Enum(UserRole, name="userrole"), nullable=False, default=UserRole.VIEWER)
    active = Column(Boolean, nullable=False, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    organization = relationship("Organization", backref="users")

    __table_args__ = (
        UniqueConstraint("organization_id", "email", name="uq_user_org_email"),
    )

