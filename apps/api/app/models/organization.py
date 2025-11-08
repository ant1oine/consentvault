"""Organization model."""
import enum
from sqlalchemy import Column, String, Enum as SQLEnum
from apps.api.app.db.base import BaseModel


class DataRegion(str, enum.Enum):
    """Data region enum."""

    KSA = "KSA"
    UAE = "UAE"


class OrganizationStatus(str, enum.Enum):
    """Organization status enum."""

    ACTIVE = "active"
    SUSPENDED = "suspended"
    DELETED = "deleted"


class Organization(BaseModel):
    """Organization model."""

    __tablename__ = "organizations"

    name = Column(String(255), nullable=False, index=True)
    data_region = Column(SQLEnum(DataRegion), nullable=False, default=DataRegion.KSA)
    status = Column(
        SQLEnum(OrganizationStatus), nullable=False, default=OrganizationStatus.ACTIVE
    )


