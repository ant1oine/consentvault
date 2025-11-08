"""Users router for admin management."""
from typing import List, Optional
from fastapi import APIRouter, Depends, Request, Header
from fastapi_limiter.depends import RateLimiter
from sqlalchemy.orm import Session

from apps.api.app.db.session import get_db
from apps.api.app.models.api_key import ApiKey
from apps.api.app.schemas.user import (
    UserCreate,
    UserUpdateRole,
    UserToggleActive,
    UserResponse,
)
from apps.api.app.services.user import UserService
from apps.api.app.core.authz import get_organization_id, require_role

router = APIRouter(
    prefix="/v1/admin/users",
    tags=["admin"],
    dependencies=[Depends(RateLimiter(times=60, seconds=60))],
)


@router.get("", response_model=List[UserResponse])
async def list_users(
    request: Request,
    db: Session = Depends(get_db),
    org_id: int = Depends(get_organization_id),
    _admin_or_auditor: ApiKey = Depends(require_role("AUDITOR")),
):
    """List all users in the organization (ADMIN or AUDITOR only)."""
    user_service = UserService(db)
    users = user_service.list_users(org_id)
    
    return [
        UserResponse(
            id=user.id,
            organization_id=user.organization_id,
            email=user.email,
            display_name=user.display_name,
            role=user.role.value,
            active=user.active,
            created_at=user.created_at.isoformat(),
            updated_at=user.updated_at.isoformat() if user.updated_at else user.created_at.isoformat(),
        )
        for user in users
    ]


@router.post("", response_model=UserResponse, status_code=201)
async def create_user(
    data: UserCreate,
    request: Request,
    db: Session = Depends(get_db),
    org_id: int = Depends(get_organization_id),
    api_key: ApiKey = Depends(require_role("ADMIN")),
):
    """Create a new user (ADMIN only)."""
    
    # Get request fingerprint
    request_fingerprint = None
    if request.client:
        request_fingerprint = f"{request.client.host}:{request.headers.get('user-agent', '')}"
    
    user_service = UserService(db)
    user = user_service.create_user(
        organization_id=org_id,
        data=data,
        actor_api_key_id=api_key.id,
        request_fingerprint=request_fingerprint,
    )
    
    return UserResponse(
        id=user.id,
        organization_id=user.organization_id,
        email=user.email,
        display_name=user.display_name,
        role=user.role.value,
        active=user.active,
        created_at=user.created_at.isoformat(),
        updated_at=user.updated_at.isoformat() if user.updated_at else user.created_at.isoformat(),
    )


@router.post("/{user_id}/role", response_model=UserResponse)
async def update_user_role(
    user_id: str,
    data: UserUpdateRole,
    request: Request,
    db: Session = Depends(get_db),
    org_id: int = Depends(get_organization_id),
    api_key: ApiKey = Depends(require_role("ADMIN")),
):
    """Update user role (ADMIN only)."""
    
    # Get request fingerprint
    request_fingerprint = None
    if request.client:
        request_fingerprint = f"{request.client.host}:{request.headers.get('user-agent', '')}"
    
    user_service = UserService(db)
    user = user_service.update_role(
        user_id=user_id,
        organization_id=org_id,
        data=data,
        actor_api_key_id=api_key.id,
        request_fingerprint=request_fingerprint,
    )
    
    return UserResponse(
        id=user.id,
        organization_id=user.organization_id,
        email=user.email,
        display_name=user.display_name,
        role=user.role.value,
        active=user.active,
        created_at=user.created_at.isoformat(),
        updated_at=user.updated_at.isoformat() if user.updated_at else user.created_at.isoformat(),
    )


@router.post("/{user_id}/active", response_model=UserResponse)
async def toggle_user_active(
    user_id: str,
    data: UserToggleActive,
    request: Request,
    db: Session = Depends(get_db),
    org_id: int = Depends(get_organization_id),
    api_key: ApiKey = Depends(require_role("ADMIN")),
):
    """Toggle user active status (ADMIN only)."""
    
    # Get request fingerprint
    request_fingerprint = None
    if request.client:
        request_fingerprint = f"{request.client.host}:{request.headers.get('user-agent', '')}"
    
    user_service = UserService(db)
    user = user_service.toggle_active(
        user_id=user_id,
        organization_id=org_id,
        active=data.active,
        actor_api_key_id=api_key.id,
        request_fingerprint=request_fingerprint,
    )
    
    return UserResponse(
        id=user.id,
        organization_id=user.organization_id,
        email=user.email,
        display_name=user.display_name,
        role=user.role.value,
        active=user.active,
        created_at=user.created_at.isoformat(),
        updated_at=user.updated_at.isoformat() if user.updated_at else user.created_at.isoformat(),
    )

