"""Rate limiting using Redis token bucket."""
import os
import time

import redis
from fastapi import HTTPException, Request, status

from apps.api.app.core.config import settings

redis_client: redis.Redis | None = None


def rate_limit_disabled() -> bool:
    """Check whether rate limiting should be bypassed (tests/local overrides)."""
    disable_env = os.getenv("DISABLE_RATE_LIMITING")
    if disable_env and disable_env.lower() in {"1", "true", "yes", "on"}:
        return True
    if os.getenv("PYTEST_CURRENT_TEST"):
        return True
    return settings.env.lower() in {"test", "testing"}


def get_redis() -> redis.Redis | None:
    """Get Redis client instance (None when disabled/unavailable)."""
    global redis_client
    if rate_limit_disabled():
        return None
    if not settings.redis_url:
        return None
    if redis_client is None:
        try:
            redis_client = redis.from_url(settings.redis_url, decode_responses=True)
            # Warm connection to fail fast if Redis is unavailable
            redis_client.ping()
        except Exception:
            redis_client = None
            return None
    return redis_client


class RateLimiter:
    """Token bucket rate limiter."""

    def __init__(self, requests_per_minute: int = 60):
        self.requests_per_minute = requests_per_minute
        self.tokens_per_second = requests_per_minute / 60.0
        self.capacity = requests_per_minute

    async def check_rate_limit(self, api_key_id: str, request: Request) -> None:
        """
        Check and enforce rate limit for an API key.

        Raises HTTPException if rate limit exceeded.
        """
        if rate_limit_disabled():
            return

        redis_conn = get_redis()
        if redis_conn is None:
            return

        key = f"rate_limit:{api_key_id}"
        now = time.time()

        # Get current state
        try:
            pipe = redis_conn.pipeline()
            pipe.hgetall(key)
            pipe.expire(key, 120)  # Keep key for 2 minutes
            result = pipe.execute()
        except redis.RedisError:
            return

        state = result[0]

        if not state:
            # First request: initialize bucket
            tokens = self.capacity - 1
            last_refill = now
        else:
            tokens = float(state.get("tokens", self.capacity))
            last_refill = float(state.get("last_refill", now))

        # Refill tokens based on elapsed time
        elapsed = now - last_refill
        tokens = min(self.capacity, tokens + elapsed * self.tokens_per_second)
        last_refill = now

        if tokens < 1:
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail="Rate limit exceeded",
                headers={"Retry-After": str(int((1 - tokens) / self.tokens_per_second))},
            )

        # Consume one token
        tokens -= 1

        # Update state
        try:
            redis_conn.hset(
                key,
                mapping={
                    "tokens": str(tokens),
                    "last_refill": str(last_refill),
                },
            )
        except redis.RedisError:
            # If Redis is unavailable mid-flight, skip enforcement rather than fail request
            return


rate_limiter = RateLimiter(requests_per_minute=settings.rate_limit_per_min)

