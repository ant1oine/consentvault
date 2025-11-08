"""Purpose model."""
from sqlalchemy import Boolean, Column, ForeignKey, Integer, String, UniqueConstraint

from apps.api.app.db.base import BaseModel


class Purpose(BaseModel):
    """Purpose model."""

    __tablename__ = "purposes"

    organization_id = Column(Integer, ForeignKey("organizations.id"), nullable=False, index=True)
    code = Column(String(100), nullable=False, index=True)
    description = Column(String(500), nullable=True)
    active = Column(Boolean, default=True, nullable=False, index=True)

    __table_args__ = (
        UniqueConstraint("organization_id", "code", name="uq_purpose_org_code"),
    )


