"""Tenant scoping dependencies."""
from typing import Optional
from sqlalchemy.orm import Session
from sqlalchemy import Column

from apps.api.app.core.errors import NotFoundError
from apps.api.app.models.organization import Organization


def ensure_tenant_access(
    db: Session, organization_id: int, model_class: type, object_id: int | str
) -> None:
    """
    Ensure the object belongs to the organization (tenant isolation).

    Raises NotFoundError if object doesn't exist or belongs to different org.
    """
    obj = db.query(model_class).filter(model_class.id == object_id).first()
    if not obj:
        raise NotFoundError(f"{model_class.__name__} not found")

    # Check if model has organization_id attribute
    if hasattr(obj, "organization_id"):
        if obj.organization_id != organization_id:
            raise NotFoundError(f"{model_class.__name__} not found")
    else:
        # For models without direct org_id, check related org
        # This is a fallback - most models should have organization_id
        raise ValueError(f"Model {model_class.__name__} does not support tenant scoping")


def filter_by_tenant(
    db: Session, organization_id: int, query, model_class: type
):
    """Filter query by organization_id."""
    if hasattr(model_class, "organization_id"):
        return query.filter(model_class.organization_id == organization_id)
    return query


