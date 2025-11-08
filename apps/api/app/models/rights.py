"""Data rights request model."""
import enum

from sqlalchemy import Column, DateTime, ForeignKey, Integer, String, Text
from sqlalchemy import Enum as SQLEnum

from apps.api.app.db.base import BaseModel


class DataRight(str, enum.Enum):
    """Data right enum."""

    ACCESS = "access"
    ERASURE = "erasure"
    PORTABILITY = "portability"


class RequestStatus(str, enum.Enum):
    """Request status enum."""

    OPEN = "open"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    REJECTED = "rejected"


class DataRightRequest(BaseModel):
    """Data rights request model."""

    __tablename__ = "data_right_requests"

    id = Column(String(26), primary_key=True)  # ULID
    organization_id = Column(Integer, ForeignKey("organizations.id"), nullable=False, index=True)
    external_user_id = Column(String(255), nullable=False, index=True)
    right = Column(SQLEnum(DataRight), nullable=False, index=True)
    status = Column(SQLEnum(RequestStatus), nullable=False, default=RequestStatus.OPEN, index=True)
    opened_at = Column(DateTime(timezone=True), nullable=False, server_default="now()")
    closed_at = Column(DateTime(timezone=True), nullable=True)
    reason = Column(Text, nullable=True)
    evidence_ref = Column(String(500), nullable=True)


