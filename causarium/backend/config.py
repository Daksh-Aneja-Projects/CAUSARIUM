from pydantic_settings import BaseSettings, SettingsConfigDict
from pydantic import SecretStr, Field
from typing import Optional

class Settings(BaseSettings):
    ENVIRONMENT: str = "development"
    LOG_LEVEL: str = "INFO"

    POSTGRES_URL: str = Field(
        "postgresql+asyncpg://postgres:postgres@localhost:5432/causarium",
        description="Async Postgres DSN"
    )
    REDIS_URL: str = Field("redis://localhost:6379/0", description="Redis DSN")

    ANTHROPIC_API_KEY: Optional[SecretStr] = None
    OPENAI_API_KEY: Optional[SecretStr] = None

    # LLM routing
    LLM_DEFAULT_MODEL: str = "claude-sonnet-4-6"
    LLM_FALLBACK_MODEL: str = "gpt-4o-mini"
    # When no provider key is configured (dev/CI), the router falls back to a
    # deterministic heuristic policy so simulations still run end-to-end.
    LLM_OFFLINE_MODE: Optional[bool] = None

    model_config = SettingsConfigDict(
        env_file=".env", env_file_encoding="utf-8", extra="ignore"
    )

    @property
    def has_llm_key(self) -> bool:
        """True if at least one usable provider key is configured."""
        for key in (self.ANTHROPIC_API_KEY, self.OPENAI_API_KEY):
            if key is None:
                continue
            value = key.get_secret_value().strip()
            if value and not value.lower().startswith("your_"):
                return True
        return False

    @property
    def offline(self) -> bool:
        """Resolved offline flag: explicit override, else auto-detect missing keys."""
        if self.LLM_OFFLINE_MODE is not None:
            return self.LLM_OFFLINE_MODE
        return not self.has_llm_key

settings = Settings()


def get_settings() -> Settings:
    """Accessor used across the app (kept for dependency-injection call sites)."""
    return settings
