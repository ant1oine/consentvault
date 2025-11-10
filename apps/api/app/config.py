"""Application configuration."""
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Application settings."""

    model_config = SettingsConfigDict(
        env_file=".env",
        env_prefix="",
        case_sensitive=False,
        extra="ignore",
    )

    # Environment
    app_env: str = "dev"

    # Database
    database_url: str

    # Security
    secret_key: str
    jwt_secret_key: str | None = None  # Optional, falls back to secret_key

    # CORS
    allowed_origins: str = ""

    # Stripe (optional)
    stripe_key: str | None = None
    stripe_price_id: str | None = None
    stripe_success_url: str | None = None
    stripe_cancel_url: str | None = None

    @property
    def allowed_origins_list(self) -> list[str]:
        """Parse allowed origins from comma-separated string."""
        if not self.allowed_origins:
            return []
        return [origin.strip() for origin in self.allowed_origins.split(",") if origin.strip()]

    @property
    def jwt_key(self) -> str:
        """Get JWT secret key, falling back to secret_key if not set."""
        return self.jwt_secret_key or self.secret_key


settings = Settings()

