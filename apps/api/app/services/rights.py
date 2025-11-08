"""Data rights service."""
from datetime import datetime
from typing import Optional

from sqlalchemy.orm import Session
from sqlalchemy import and_

from apps.api.app.models.rights import DataRightRequest, DataRight, RequestStatus
from apps.api.app.utils.ids import generate_ulid
from apps.api.app.services.audit import AuditService
from apps.api.app.services.webhook import WebhookService


class RightsService:
    """Service for data rights requests."""

    def __init__(self, db: Session):
        self.db = db
        self.audit_service = AuditService(db)
        self.webhook_service = WebhookService(db)

    def create_request(
        self,
        organization_id: int,
        external_user_id: str,
        right: DataRight,
        reason: Optional[str] = None,
        api_key_id: int = None,
    ) -> DataRightRequest:
        """Create a new data rights request."""
        request_id = generate_ulid()
        now = datetime.utcnow()

        request = DataRightRequest(
            id=request_id,
            organization_id=organization_id,
            external_user_id=external_user_id,
            right=right,
            status=RequestStatus.OPEN,
            opened_at=now,
            reason=reason,
        )
        self.db.add(request)
        self.db.flush()

        # Write audit log
        prev_hash = self.audit_service.get_latest_hash(organization_id)
        event_data = {
            "id": request_id,
            "organization_id": organization_id,
            "external_user_id": external_user_id,
            "right": right.value,
            "status": RequestStatus.OPEN.value,
            "timestamp": now.isoformat(),
        }
        entry_hash = self.audit_service.compute_hash(prev_hash, event_data)
        self.audit_service.log_event(
            organization_id=organization_id,
            actor_api_key_id=api_key_id,
            event_type="right.opened",
            object_type="DataRightRequest",
            object_id=request_id,
            prev_hash=prev_hash,
            entry_hash=entry_hash,
        )

        self.db.commit()
        self.db.refresh(request)

        # Emit webhook
        self.webhook_service.enqueue_webhook(
            organization_id=organization_id,
            event_type="right.opened",
            payload={
                "event_type": "right.opened",
                "request_id": request_id,
                "external_user_id": external_user_id,
                "right": right.value,
                "timestamp": now.isoformat(),
            },
        )

        return request

    def complete_request(
        self,
        organization_id: int,
        request_id: str,
        evidence_ref: str,
        api_key_id: int = None,
    ) -> DataRightRequest:
        """Complete a data rights request."""
        request = (
            self.db.query(DataRightRequest)
            .filter(
                and_(
                    DataRightRequest.id == request_id,
                    DataRightRequest.organization_id == organization_id,
                )
            )
            .first()
        )
        if not request:
            raise ValueError("Request not found")

        request.status = RequestStatus.COMPLETED
        request.closed_at = datetime.utcnow()
        request.evidence_ref = evidence_ref

        # Write audit log
        prev_hash = self.audit_service.get_latest_hash(organization_id)
        event_data = {
            "id": request_id,
            "organization_id": organization_id,
            "status": RequestStatus.COMPLETED.value,
            "evidence_ref": evidence_ref,
            "timestamp": datetime.utcnow().isoformat(),
        }
        entry_hash = self.audit_service.compute_hash(prev_hash, event_data)
        self.audit_service.log_event(
            organization_id=organization_id,
            actor_api_key_id=api_key_id,
            event_type="right.completed",
            object_type="DataRightRequest",
            object_id=request_id,
            prev_hash=prev_hash,
            entry_hash=entry_hash,
        )

        self.db.commit()
        self.db.refresh(request)

        # Emit webhook
        self.webhook_service.enqueue_webhook(
            organization_id=organization_id,
            event_type="right.completed",
            payload={
                "event_type": "right.completed",
                "request_id": request_id,
                "external_user_id": request.external_user_id,
                "right": request.right.value,
                "evidence_ref": evidence_ref,
                "timestamp": datetime.utcnow().isoformat(),
            },
        )

        return request

    def list_requests(
        self,
        organization_id: int,
        status: Optional[RequestStatus] = None,
        right: Optional[DataRight] = None,
        limit: int = 100,
        offset: int = 0,
    ) -> list[DataRightRequest]:
        """List data rights requests."""
        query = self.db.query(DataRightRequest).filter(
            DataRightRequest.organization_id == organization_id
        )
        if status:
            query = query.filter(DataRightRequest.status == status)
        if right:
            query = query.filter(DataRightRequest.right == right)
        return query.order_by(DataRightRequest.opened_at.desc()).limit(limit).offset(offset).all()


