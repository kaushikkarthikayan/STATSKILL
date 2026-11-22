"""Application settings, read from environment variables and backend/.env."""

from pathlib import Path

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict

# The backend/ folder (this file is backend/app/core/config.py).
BACKEND_ROOT = Path(__file__).resolve().parents[2]


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=BACKEND_ROOT / ".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    APP_NAME: str = "StatSkill AI"
    APP_VERSION: str = "1.0.0"

    # "sqlite" needs no server and is the default for local development.
    # "postgres" uses PostgreSQL with the DATABASE_* values below.
    DB_ENGINE: str = Field(default="sqlite", pattern="^(sqlite|postgres)$")
    SQLITE_PATH: str = "data/statskill.db"
    DATABASE_NAME: str = "statskill_db"
    DATABASE_USER: str = "postgres"
    DATABASE_PASSWORD: str = ""
    DATABASE_HOST: str = "localhost"
    DATABASE_PORT: int = 5432

    SECRET_KEY: str = Field(..., min_length=32)
    ACCESS_TOKEN_EXPIRE_MINUTES: int = Field(default=60, ge=5, le=1440)
    REMEMBER_ME_DAYS: int = Field(default=14, ge=1, le=60)
    RESET_TOKEN_MINUTES: int = Field(default=30, ge=5, le=240)
    # No email server is configured yet, so reset links are printed to the backend terminal (local development only).
    PRINT_RESET_LINKS: bool = True
    FRONTEND_URL: str = "http://127.0.0.1:5173"

    CORS_ORIGINS: str = "http://localhost:5173,http://127.0.0.1:5173"
    UPLOAD_DIR: str = "storage/resources"
    MAX_UPLOAD_MB: int = Field(default=20, ge=1, le=100)

    @property
    def sqlite_file(self) -> Path:
        path = Path(self.SQLITE_PATH)
        return path if path.is_absolute() else BACKEND_ROOT / path

    @property
    def upload_root(self) -> Path:
        path = Path(self.UPLOAD_DIR)
        return path if path.is_absolute() else BACKEND_ROOT / path

    @property
    def cors_origin_list(self) -> list[str]:
        return [origin.strip() for origin in self.CORS_ORIGINS.split(",") if origin.strip()]

    @property
    def max_upload_bytes(self) -> int:
        return self.MAX_UPLOAD_MB * 1024 * 1024


settings = Settings()
