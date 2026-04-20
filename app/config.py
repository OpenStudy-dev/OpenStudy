from functools import lru_cache
from typing import List
from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    # Supabase
    supabase_url: str = Field(default="")
    supabase_service_key: str = Field(default="")

    # Auth
    app_password_hash: str = Field(default="")
    session_secret: str = Field(default="dev-only-change-me")
    session_ttl_days: int = 30

    # Public origin (scheme+host, no trailing slash) — required for OAuth/MCP URLs.
    # In prod, set to the Vercel URL. In dev, leave blank and we'll derive from the request.
    public_url: str = ""

    # CORS — comma-separated
    cors_origins: str = "http://localhost:5173,http://localhost:5174"

    # Rate limit
    login_attempts_window_min: int = 10
    login_attempts_max: int = 5

    @property
    def cors_origins_list(self) -> List[str]:
        return [o.strip() for o in self.cors_origins.split(",") if o.strip()]


@lru_cache
def get_settings() -> Settings:
    return Settings()
