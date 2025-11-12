"""Authentication router."""
from datetime import timedelta
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.db import Org, OrgUser, User, get_db
from app.deps import get_current_user
from app.schemas import LoginRequest, TokenResponse
from app.security import create_access_token, hash_password, verify_password

router = APIRouter(prefix="/auth", tags=["Auth"])


@router.post("/login", response_model=TokenResponse)
def login(request: LoginRequest, db: Session = Depends(get_db)):
    """Authenticate user and return JWT access token."""
    user = db.query(User).filter(User.email == request.email.lower().strip()).first()

    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
        )

    if not verify_password(request.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
        )

    # Use 7-day expiration for all tokens
    access_token_expires = timedelta(days=7)
    
    # Superadmin login - no org validation needed
    if user.is_superadmin:
        access_token = create_access_token(
            data={"sub": str(user.id), "email": user.email, "is_superadmin": True},
            expires_delta=access_token_expires,
        )
        return TokenResponse(access_token=access_token)

    # Regular user login - get user's org memberships
    memberships = db.query(OrgUser).filter(OrgUser.user_id == user.id).all()
    org_ids = [str(m.org_id) for m in memberships]

    access_token = create_access_token(
        data={"sub": str(user.id), "email": user.email},
        expires_delta=access_token_expires,
    )

    return TokenResponse(access_token=access_token)


@router.get("/me")
def get_current_user_info(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Returns basic information about the currently authenticated user.
    """
    try:
        # Superadmins operate at platform level - not tied to any org
        if current_user.is_superadmin:
            return {
                "email": current_user.email,
                "role": "super admin",
                "is_superadmin": True,
                "orgs": [],
            }

        # Regular user - get their org memberships
        memberships = (
            db.query(OrgUser, Org)
            .join(Org, OrgUser.org_id == Org.id)
            .filter(OrgUser.user_id == current_user.id)
            .all()
        )

        orgs = [
            {
                "org_id": str(org_user.org_id),
                "id": str(org_user.org_id),  # For compatibility
                "name": org.name,
                "role": org_user.role,
            }
            for org_user, org in memberships
        ]

        role = memberships[0][0].role if memberships else "user"

        return {
            "email": current_user.email,
            "role": role,
            "is_superadmin": False,
            "orgs": orgs,
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get user info: {str(e)}",
        )
