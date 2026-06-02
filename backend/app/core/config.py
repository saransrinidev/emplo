from functools import lru_cache
from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict

# Absolute path to backend/.env so it's found regardless of the working directory
# (e.g. when uvicorn is launched from the workspace root with --app-dir).
_ENV_FILE = Path(__file__).resolve().parents[2] / ".env"


class Settings(BaseSettings):
    """Application settings loaded from environment variables / .env file."""

    model_config = SettingsConfigDict(
        env_file=str(_ENV_FILE), env_file_encoding="utf-8", extra="ignore"
    )

    database_url: str = "postgresql+psycopg://postgres:postgres@localhost:5432/hr_portal"
    db_ssl_mode: str = "disable"

    jwt_secret_key: str = "change-me"
    jwt_algorithm: str = "HS256"
    access_token_expire_minutes: int = 30
    refresh_token_expire_days: int = 7

    @property
    def sqlalchemy_connect_args(self) -> dict:
        """Supabase needs SSL; local Postgres usually does not."""
        mode = (self.db_ssl_mode or "").strip().lower()
        if mode and mode != "disable":
            return {"sslmode": mode}
        return {}


@lru_cache
def get_settings() -> Settings:
    return Settings()
