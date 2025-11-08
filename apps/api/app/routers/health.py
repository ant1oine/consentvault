"""Health check router."""
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import text

from apps.api.app.db.session import get_db
from apps.api.app.core.rate_limit import get_redis

router = APIRouter()


@router.get("/healthz")
async def health_check(db: Session = Depends(get_db)):
    """Health check endpoint."""
    # Check database
    try:
        db.execute(text("SELECT 1"))
        db_status = "ok"
    except Exception:
        db_status = "error"

    # Check Redis
    try:
        redis = get_redis()
        redis.ping()
        redis_status = "ok"
    except Exception:
        redis_status = "error"

    status_code = 200 if db_status == "ok" and redis_status == "ok" else 503

    return {
        "status": "ok" if status_code == 200 else "degraded",
        "version": "0.1.0",
        "database": db_status,
        "redis": redis_status,
    }


