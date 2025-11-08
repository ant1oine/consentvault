"""Application configuration."""
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Application settings."""

    model_config = SettingsConfigDict(
        env_file=".env",
        env_prefix="",
        case_sensitive=False,
    )

    env: str = "local"
    database_url: str
    redis_url: str = "redis://localhost:6379/0"
    master_encryption_key: str
    rate_limit_per_min: int = 60
    allowed_origins: str = ""
    api_body_max_bytes: int = 1048576
    enable_hmac_verification: bool = True

    @property
    def allowed_origins_list(self) -> list[str]:
        """Parse allowed origins from comma-separated string."""
        if not self.allowed_origins:
            return []
        return [origin.strip() for origin in self.allowed_origins.split(",")]


settings = Settings()


