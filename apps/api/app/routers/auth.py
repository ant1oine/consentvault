"""Authentication router."""
from datetime import timedelta
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.db import OrgUser, User, get_db
from app.deps import get_current_user
from app.schemas import LoginRequest, TokenResponse
from app.security import create_access_token, hash_password, verify_password

router = APIRouter(tags=["Auth"])


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

    # Superadmin login - no org validation needed
    if user.is_superadmin:
        access_token_expires = timedelta(minutes=30)
        access_token = create_access_token(
            data={"sub": str(user.id), "email": user.email, "is_superadmin": True},
            expires_delta=access_token_expires,
        )
        return TokenResponse(access_token=access_token)

    # Regular user login - get user's org memberships
    memberships = db.query(OrgUser).filter(OrgUser.user_id == user.id).all()
    org_ids = [str(m.org_id) for m in memberships]

    access_token_expires = timedelta(minutes=30)
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
    """Get current authenticated user information with org memberships."""
    # Superadmin doesn't need org memberships
    if current_user.is_superadmin:
        return {
            "id": current_user.id,
            "email": current_user.email,
            "is_superadmin": True,
            "orgs": [],
        }

    memberships = db.query(OrgUser).filter(OrgUser.user_id == current_user.id).all()

    return {
        "id": current_user.id,
        "email": current_user.email,
        "is_superadmin": False,
        "orgs": [
            {
                "org_id": str(m.org_id),
                "role": m.role,
            }
            for m in memberships
        ],
    }
