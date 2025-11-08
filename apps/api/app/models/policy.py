"""Policy model."""
from sqlalchemy import Boolean, Column, ForeignKey, Integer, UniqueConstraint

from apps.api.app.db.base import BaseModel


class Policy(BaseModel):
    """Policy model for retention rules."""

    __tablename__ = "policies"

    organization_id = Column(Integer, ForeignKey("organizations.id"), nullable=False, index=True)
    purpose_id = Column(Integer, ForeignKey("purposes.id"), nullable=False, index=True)
    retention_days = Column(Integer, nullable=False)
    active = Column(Boolean, default=True, nullable=False, index=True)

    __table_args__ = (
        UniqueConstraint("organization_id", "purpose_id", name="uq_policy_org_purpose"),
    )


