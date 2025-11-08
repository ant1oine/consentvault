"""Rate limiting using fastapi-limiter."""
import os
from fastapi import FastAPI
from fastapi_limiter import FastAPILimiter
import redis.asyncio as redis


async def init_rate_limit(app: FastAPI):
    """Initialize rate limiting with Redis."""
    url = os.getenv("REDIS_URL")
    if not url:
        return
    r = redis.from_url(url, encoding="utf-8", decode_responses=True)
    await FastAPILimiter.init(r)

