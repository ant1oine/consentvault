"""Rate limiting helpers."""
import os

import redis.asyncio as redis
import structlog
from fastapi import Depends, FastAPI, Request
from fastapi_limiter import FastAPILimiter
from fastapi_limiter.depends import RateLimiter as FastAPIRateLimiter

from apps.api.app.core.rate_limit import rate_limit_disabled

log = structlog.get_logger()


async def init_rate_limit(app: FastAPI):
    """Initialize rate limiting with Redis."""
    url = os.getenv("REDIS_URL")
    if not url:
        log.warning("rate_limit_disabled", reason="REDIS_URL not set")
        return
    try:
        r = redis.from_url(url, encoding="utf-8", decode_responses=True)
        await FastAPILimiter.init(r)
        log.info("rate_limit_enabled", redis=url)
    except Exception as exc:
        log.warning("rate_limit_disabled", reason=str(exc))


def optional_rate_limit(times: int = 60, seconds: int = 60):
    """
    Wrap FastAPI RateLimiter to degrade gracefully when Redis isn't available.

    Returns:
        fastapi.Depends that enforces rate limiting when FastAPILimiter is initialized.
    """
    limiter = FastAPIRateLimiter(times=times, seconds=seconds)

    async def dependency(request: Request):
        if rate_limit_disabled():
            return
        if getattr(FastAPILimiter, "redis", None) is None:
            return
        return await limiter(request, None)

    return Depends(dependency)
