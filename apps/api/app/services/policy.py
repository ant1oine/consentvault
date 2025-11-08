"""Policy service."""
from sqlalchemy import and_
from sqlalchemy.orm import Session

from apps.api.app.models.policy import Policy
from apps.api.app.models.purpose import Purpose


class PolicyService:
    """Service for retention policies."""

    def __init__(self, db: Session):
        self.db = db

    def upsert_policy(
        self, organization_id: int, purpose_id: int, retention_days: int, active: bool = True
    ) -> Policy:
        """Create or update a retention policy."""
        # Verify purpose belongs to org
        purpose = (
            self.db.query(Purpose)
            .filter(
                and_(
                    Purpose.id == purpose_id,
                    Purpose.organization_id == organization_id,
                )
            )
            .first()
        )
        if not purpose:
            raise ValueError("Purpose not found")

        policy = (
            self.db.query(Policy)
            .filter(
                and_(
                    Policy.organization_id == organization_id,
                    Policy.purpose_id == purpose_id,
                )
            )
            .first()
        )

        if policy:
            policy.retention_days = retention_days
            policy.active = active
        else:
            policy = Policy(
                organization_id=organization_id,
                purpose_id=purpose_id,
                retention_days=retention_days,
                active=active,
            )
            self.db.add(policy)

        self.db.commit()
        self.db.refresh(policy)
        return policy

    def list_policies(self, organization_id: int) -> list[Policy]:
        """List policies for organization."""
        return (
            self.db.query(Policy)
            .filter(Policy.organization_id == organization_id)
            .all()
        )


