"""Test router for verification."""
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.db import Org, OrgMember, get_db

router = APIRouter(prefix="/v1", tags=["Test"])


@router.get("/test-seed")
async def test_seed(db: Session = Depends(get_db)):
    """Test route to verify seed data."""
    orgs = db.query(Org).all()
    users = db.query(OrgMember).all()
    return {"orgs": len(orgs), "users": len(users)}

