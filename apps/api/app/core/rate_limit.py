"""Rate limiting using Redis token bucket."""
import time
from typing import Optional

import redis
from fastapi import HTTPException, Request, status

from apps.api.app.core.config import settings

redis_client: Optional[redis.Redis] = None


def get_redis() -> redis.Redis:
    """Get Redis client instance."""
    global redis_client
    if redis_client is None:
        redis_client = redis.from_url(settings.redis_url, decode_responses=True)
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
        redis_conn = get_redis()
        key = f"rate_limit:{api_key_id}"
        now = time.time()

        # Get current state
        pipe = redis_conn.pipeline()
        pipe.hgetall(key)
        pipe.expire(key, 120)  # Keep key for 2 minutes
        result = pipe.execute()
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
        redis_conn.hset(
            key,
            mapping={
                "tokens": str(tokens),
                "last_refill": str(last_refill),
            },
        )


rate_limiter = RateLimiter(requests_per_minute=settings.rate_limit_per_min)


