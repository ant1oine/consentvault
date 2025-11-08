"""Consent service."""
from datetime import datetime
from typing import Optional

from sqlalchemy.orm import Session
from sqlalchemy import and_

from apps.api.app.core.security import hash_with_salt
from apps.api.app.core.config import settings
from apps.api.app.utils.crypto import encrypt_fields
from apps.api.app.models.consent import ConsentAggregate, ConsentEvent, ConsentStatus, ConsentMethod
from apps.api.app.models.purpose import Purpose
from apps.api.app.models.system import System
from apps.api.app.models.api_key import ApiKey
from apps.api.app.utils.ids import generate_ulid
from apps.api.app.utils.hashing import compute_audit_hash
from apps.api.app.services.audit import AuditService
from apps.api.app.services.webhook import WebhookService


class ConsentService:
    """Service for consent management."""

    def __init__(self, db: Session):
        self.db = db
        self.audit_service = AuditService(db)
        self.webhook_service = WebhookService(db)

    def create_or_update_consent(
        self,
        organization_id: int,
        external_user_id: str,
        purpose_code: str,
        status: ConsentStatus,
        method: ConsentMethod,
        source: Optional[str] = None,
        system_code: Optional[str] = None,
        evidence_ref: Optional[str] = None,
        encrypted_fields: Optional[dict] = None,
        api_key_id: int = None,
        ip_address: Optional[str] = None,
        user_agent: Optional[str] = None,
    ) -> ConsentAggregate:
        """Create or update consent aggregate and append event."""
        # Get purpose
        purpose = (
            self.db.query(Purpose)
            .filter(
                and_(
                    Purpose.organization_id == organization_id,
                    Purpose.code == purpose_code,
                    Purpose.active == True,
                )
            )
            .first()
        )
        if not purpose:
            raise ValueError(f"Purpose '{purpose_code}' not found")

        # Get system if provided
        source_system_id = None
        if system_code:
            system = (
                self.db.query(System)
                .filter(
                    and_(
                        System.organization_id == organization_id,
                        System.code == system_code,
                    )
                )
                .first()
            )
            if system:
                source_system_id = system.id

        # Encrypt fields if provided
        encrypted_data = None
        if encrypted_fields:
            # Get org encryption key (simplified - in production, store per-org key)
            org_secret = self._get_org_secret(organization_id)
            encrypted_data = encrypt_fields({"encrypted_fields": encrypted_fields}, org_secret)[
                "encrypted_fields"
            ]

        # Hash IP and user agent
        ip_hash = None
        user_agent_hash = None
        if ip_address or user_agent:
            org_secret = self._get_org_secret(organization_id)
            if ip_address:
                ip_hash = hash_with_salt(ip_address, org_secret)
            if user_agent:
                user_agent_hash = hash_with_salt(user_agent, org_secret)

        # Get or create aggregate
        aggregate = (
            self.db.query(ConsentAggregate)
            .filter(
                and_(
                    ConsentAggregate.organization_id == organization_id,
                    ConsentAggregate.external_user_id == external_user_id,
                    ConsentAggregate.purpose_id == purpose.id,
                )
            )
            .first()
        )

        now = datetime.utcnow()
        if aggregate:
            aggregate.status = status
            aggregate.last_event_at = now
            aggregate.source_system_id = source_system_id
            aggregate.evidence_ref = evidence_ref
            if encrypted_data:
                aggregate.encrypted_fields = encrypted_data
        else:
            aggregate = ConsentAggregate(
                organization_id=organization_id,
                external_user_id=external_user_id,
                purpose_id=purpose.id,
                status=status,
                last_event_at=now,
                source_system_id=source_system_id,
                evidence_ref=evidence_ref,
                encrypted_fields=encrypted_data,
            )
            self.db.add(aggregate)
            self.db.flush()

        # Get previous audit hash for chain
        prev_hash = self.audit_service.get_latest_hash(organization_id)

        # Create event
        event_id = generate_ulid()
        event_data = {
            "id": event_id,
            "organization_id": organization_id,
            "aggregate_id": aggregate.id,
            "purpose_id": purpose.id,
            "status": status.value,
            "method": method.value,
            "source": source,
            "timestamp": now.isoformat(),
            "evidence_ref": evidence_ref,
        }
        event_hash = compute_audit_hash(prev_hash, event_data)

        event = ConsentEvent(
            id=event_id,
            organization_id=organization_id,
            aggregate_id=aggregate.id,
            purpose_id=purpose.id,
            status=status,
            method=method,
            source=source,
            ip_hash=ip_hash,
            user_agent_hash=user_agent_hash,
            timestamp=now,
            evidence_ref=evidence_ref,
            prev_hash=prev_hash,
            event_hash=event_hash,
        )
        self.db.add(event)

        # Write audit log
        self.audit_service.log_event(
            organization_id=organization_id,
            actor_api_key_id=api_key_id,
            event_type=f"consent.{status.value}",
            object_type="ConsentEvent",
            object_id=event_id,
            prev_hash=prev_hash,
            entry_hash=event_hash,
        )

        self.db.commit()
        self.db.refresh(aggregate)

        # Emit webhook
        event_type = f"consent.{status.value}"
        self.webhook_service.enqueue_webhook(
            organization_id=organization_id,
            event_type=event_type,
            payload={
                "event_type": event_type,
                "consent_event_id": event_id,
                "aggregate_id": aggregate.id,
                "external_user_id": external_user_id,
                "purpose_code": purpose_code,
                "status": status.value,
                "timestamp": now.isoformat(),
            },
        )

        return aggregate

    def get_latest_consent(
        self, organization_id: int, external_user_id: str, purpose_code: str
    ) -> Optional[ConsentAggregate]:
        """Get latest consent for user and purpose."""
        purpose = (
            self.db.query(Purpose)
            .filter(
                and_(
                    Purpose.organization_id == organization_id,
                    Purpose.code == purpose_code,
                )
            )
            .first()
        )
        if not purpose:
            return None

        aggregate = (
            self.db.query(ConsentAggregate)
            .filter(
                and_(
                    ConsentAggregate.organization_id == organization_id,
                    ConsentAggregate.external_user_id == external_user_id,
                    ConsentAggregate.purpose_id == purpose.id,
                )
            )
            .first()
        )
        return aggregate

    def list_aggregates(
        self,
        organization_id: int,
        limit: int = 100,
        offset: int = 0,
    ) -> list[ConsentAggregate]:
        """List consent aggregates for organization."""
        query = self.db.query(ConsentAggregate).filter(
            ConsentAggregate.organization_id == organization_id
        )
        return query.order_by(ConsentAggregate.last_event_at.desc()).limit(limit).offset(offset).all()

    def list_events(
        self,
        organization_id: int,
        since: Optional[datetime] = None,
        limit: int = 100,
        offset: int = 0,
    ) -> list[ConsentEvent]:
        """List consent events for organization."""
        query = self.db.query(ConsentEvent).filter(
            ConsentEvent.organization_id == organization_id
        )
        if since:
            query = query.filter(ConsentEvent.timestamp >= since)
        return query.order_by(ConsentEvent.timestamp.desc()).limit(limit).offset(offset).all()

    def _get_org_secret(self, organization_id: int) -> str:
        """Get organization secret for hashing/encryption (simplified)."""
        # In production, this would fetch from a secure store
        # For now, use master key + org_id as salt
        return f"{settings.master_encryption_key}:{organization_id}"

