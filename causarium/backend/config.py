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
    
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8")

settings = Settings()
