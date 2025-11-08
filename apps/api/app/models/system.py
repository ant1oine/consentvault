"""System model."""
from sqlalchemy import Column, String, Integer, ForeignKey, UniqueConstraint
from apps.api.app.db.base import BaseModel


class System(BaseModel):
    """System model for client internal systems registry."""

    __tablename__ = "systems"

    organization_id = Column(Integer, ForeignKey("organizations.id"), nullable=False, index=True)
    code = Column(String(100), nullable=False, index=True)
    description = Column(String(500), nullable=True)

    __table_args__ = (
        UniqueConstraint("organization_id", "code", name="uq_system_org_code"),
    )


