"""Database setup and session management."""
import os
import uuid

from sqlalchemy import (
    Boolean,
    JSON,
    Column,
    DateTime,
    ForeignKey,
    String,
    Text,
    UniqueConstraint,
    create_engine,
    func,
)
from sqlalchemy.dialects.postgresql import INET, JSONB, UUID
from sqlalchemy.orm import Session, declarative_base, relationship, sessionmaker

from app.config import settings

# Validate required environment variables
required_envs = ["DB_HOST", "DB_PORT", "DB_USER", "DB_PASSWORD", "DB_NAME", "DATABASE_URL"]
for var in required_envs:
    if not os.getenv(var):
        raise RuntimeError(f"Missing required environment variable: {var}")

# Create engine
engine = create_engine(
    settings.database_url,
    pool_pre_ping=True,
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()


def get_db() -> Session:
    """Dependency for getting database session."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


# Models
class User(Base):
    """User model."""

    __tablename__ = "users"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    email = Column(String(255), unique=True, nullable=False, index=True)
    password_hash = Column(String(255), nullable=False)
    is_superadmin = Column(Boolean, default=False, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    org_memberships = relationship("OrgUser", back_populates="user", cascade="all, delete-orphan")


class Org(Base):
    """Organization model."""

    __tablename__ = "orgs"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String(255), nullable=False)
    region = Column(String(100), nullable=False)
    api_key = Column(String(64), unique=True, nullable=False, index=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    members = relationship("OrgUser", back_populates="org", cascade="all, delete-orphan")
    org_members = relationship("OrgMember", back_populates="org", cascade="all, delete-orphan")
    consents = relationship("Consent", back_populates="org", cascade="all, delete-orphan")
    audit_logs = relationship("AuditLog", back_populates="org")
    data_right_requests = relationship("DataRightRequest", back_populates="org", cascade="all, delete-orphan")


class OrgUser(Base):
    """Organization membership model."""

    __tablename__ = "org_users"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    org_id = Column(UUID(as_uuid=True), ForeignKey("orgs.id"), nullable=False, index=True)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False, index=True)
    role = Column(String(20), nullable=False)  # 'admin', 'editor', 'viewer'

    org = relationship("Org", back_populates="members")
    user = relationship("User", back_populates="org_memberships")

    __table_args__ = (
        UniqueConstraint("org_id", "user_id", name="uq_org_user"),
    )


class OrgMember(Base):
    """Organization member model (simplified user linked to org)."""

    __tablename__ = "org_members"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    org_id = Column(UUID(as_uuid=True), ForeignKey("orgs.id"), nullable=False, index=True)
    email = Column(String(255), nullable=False, index=True)
    name = Column(String(255), nullable=False)
    role = Column(String(50), nullable=False)  # 'patient', 'subscriber', 'admin', etc.
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    org = relationship("Org", back_populates="org_members")

    __table_args__ = (
        UniqueConstraint("org_id", "email", name="uq_org_member_email"),
    )


class Consent(Base):
    """Consent record model."""

    __tablename__ = "consents"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    org_id = Column(UUID(as_uuid=True), ForeignKey("orgs.id"), nullable=False, index=True)
    subject_id = Column(String(255), nullable=True, index=True)  # Keep for backward compatibility
    subject_email = Column(String(255), nullable=True, index=True)
    purpose = Column(String(255), nullable=False, index=True)
    text = Column(Text, nullable=True)  # Made nullable with default
    version_hash = Column(String(64), nullable=False)
    ip = Column(INET, nullable=True)
    user_agent = Column(Text, nullable=True)
    accepted_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    revoked_at = Column(DateTime(timezone=True), nullable=True)
    metadata_json = Column(JSON, nullable=False, default=dict)

    org = relationship("Org", back_populates="consents")


class AuditLog(Base):
    """Audit log model for tracking all actions."""

    __tablename__ = "audit_logs"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    org_id = Column(UUID(as_uuid=True), ForeignKey("orgs.id"), nullable=True, index=True)
    user_email = Column(String(255), nullable=True)
    action = Column(String(100), nullable=False, index=True)
    entity_type = Column(String(100), nullable=False, index=True)
    entity_id = Column(UUID(as_uuid=True), nullable=True)
    metadata_json = Column(JSONB, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False, index=True)

    org = relationship("Org", back_populates="audit_logs")


class DataRightRequest(Base):
    """Data Subject Access Request (DSAR) model."""

    __tablename__ = "data_right_requests"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    org_id = Column(UUID(as_uuid=True), ForeignKey("orgs.id"), nullable=False, index=True)
    subject_email = Column(String(255), nullable=False, index=True)
    request_type = Column(String(50), nullable=False)  # "access" | "rectify" | "erase"
    status = Column(String(50), nullable=False, default="pending")  # "pending" | "processing" | "completed" | "rejected"
    notes = Column(Text, nullable=True)
    processed_by = Column(String(255), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)

    org = relationship("Org", back_populates="data_right_requests")


def init_db():
    """Initialize database - create all tables."""
    Base.metadata.create_all(bind=engine)

