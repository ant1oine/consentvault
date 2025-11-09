"""User service."""
from datetime import UTC, datetime

from sqlalchemy import and_, desc
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from apps.api.app.core.errors import NotFoundError, ValidationError
from apps.api.app.models.user import User
from apps.api.app.schemas.user import UserCreate, UserUpdateRole
from apps.api.app.services.audit import AuditService
from apps.api.app.utils.ids import generate_ulid


class UserService:
    """Service for user management."""

    def __init__(self, db: Session):
        self.db = db
        self.audit_service = AuditService(db)

    def list_users(self, organization_id: int) -> list[User]:
        """List all users for an organization."""
        return (
            self.db.query(User)
            .filter(User.organization_id == organization_id)
            .order_by(desc(User.created_at))
            .all()
        )

    def create_user(
        self,
        organization_id: int,
        data: UserCreate,
        actor_api_key_id: int | None,
        request_fingerprint: str | None = None,
    ) -> User:
        """Create a new user."""
        # Normalize email to lowercase
        email = data.email.lower().strip()

        # Check for existing user with same email in org
        existing = (
            self.db.query(User)
            .filter(
                and_(
                    User.organization_id == organization_id,
                    User.email == email,
                )
            )
            .first()
        )
        if existing:
            raise ValidationError(f"User with email {email} already exists in this organization")

        # Create user
        user = User(
            id=generate_ulid(),
            organization_id=organization_id,
            email=email,
            display_name=data.display_name,
            role=data.role,
            active=True,
        )
        self.db.add(user)
        try:
            self.db.commit()
            self.db.refresh(user)
        except IntegrityError as e:
            self.db.rollback()
            raise ValidationError(f"Failed to create user: {str(e)}")

        # Log audit event
        prev_hash = self.audit_service.get_latest_hash(organization_id)
        event_time = datetime.now(UTC)
        event_data = {
            "event_type": "user.created",
            "object_type": "User",
            "object_id": user.id,
            "organization_id": organization_id,
            "email": user.email,
            "role": user.role.value,
            "created_by_api_key_id": actor_api_key_id,
            "timestamp": event_time.isoformat(),
        }
        entry_hash = self.audit_service.compute_hash(prev_hash, event_data)
        self.audit_service.log_event(
            organization_id=organization_id,
            actor_api_key_id=actor_api_key_id,
            event_type="user.created",
            object_type="User",
            object_id=user.id,
            prev_hash=prev_hash,
            entry_hash=entry_hash,
            request_fingerprint=request_fingerprint,
        )

        return user

    def update_role(
        self,
        user_id: str,
        organization_id: int,
        data: UserUpdateRole,
        actor_api_key_id: int | None,
        request_fingerprint: str | None = None,
    ) -> User:
        """Update user role."""
        user = (
            self.db.query(User)
            .filter(
                and_(
                    User.id == user_id,
                    User.organization_id == organization_id,
                )
            )
            .first()
        )
        if not user:
            raise NotFoundError("User not found")

        old_role = user.role.value
        user.role = data.role
        self.db.commit()
        self.db.refresh(user)

        # Log audit event
        prev_hash = self.audit_service.get_latest_hash(organization_id)
        event_time = datetime.now(UTC)
        event_data = {
            "event_type": "user.role_changed",
            "object_type": "User",
            "object_id": user.id,
            "organization_id": organization_id,
            "old_role": old_role,
            "new_role": user.role.value,
            "changed_by_api_key_id": actor_api_key_id,
            "timestamp": event_time.isoformat(),
        }
        entry_hash = self.audit_service.compute_hash(prev_hash, event_data)
        self.audit_service.log_event(
            organization_id=organization_id,
            actor_api_key_id=actor_api_key_id,
            event_type="user.role_changed",
            object_type="User",
            object_id=user.id,
            prev_hash=prev_hash,
            entry_hash=entry_hash,
            request_fingerprint=request_fingerprint,
        )

        return user

    def toggle_active(
        self,
        user_id: str,
        organization_id: int,
        active: bool,
        actor_api_key_id: int | None,
        request_fingerprint: str | None = None,
    ) -> User:
        """Toggle user active status."""
        user = (
            self.db.query(User)
            .filter(
                and_(
                    User.id == user_id,
                    User.organization_id == organization_id,
                )
            )
            .first()
        )
        if not user:
            raise NotFoundError("User not found")

        user.active = active
        self.db.commit()
        self.db.refresh(user)

        # Log audit event
        event_type = "user.activated" if active else "user.deactivated"
        prev_hash = self.audit_service.get_latest_hash(organization_id)
        event_time = datetime.now(UTC)
        event_data = {
            "event_type": event_type,
            "object_type": "User",
            "object_id": user.id,
            "organization_id": organization_id,
            "active": active,
            "changed_by_api_key_id": actor_api_key_id,
            "timestamp": event_time.isoformat(),
        }
        entry_hash = self.audit_service.compute_hash(prev_hash, event_data)
        self.audit_service.log_event(
            organization_id=organization_id,
            actor_api_key_id=actor_api_key_id,
            event_type=event_type,
            object_type="User",
            object_id=user.id,
            prev_hash=prev_hash,
            entry_hash=entry_hash,
            request_fingerprint=request_fingerprint,
        )

        return user




