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

    # LLM routing --------------------------------------------------------- #
    # Provider: "ollama" (local, default) or "hosted" (Anthropic/OpenAI via keys).
    LLM_PROVIDER: str = "ollama"
    OLLAMA_BASE_URL: str = "http://localhost:11434"

    # Role-based model mapping. Ollama models are prefixed ollama_chat/ so
    # LiteLLM uses the chat endpoint; embeddings use the plain ollama/ prefix.
    # Defaults are tuned for a CPU / 16GB machine (models <= ~8B).
    LLM_DEFAULT_MODEL: str = "ollama_chat/llama3.1:8b"       # agent cognition
    LLM_FALLBACK_MODEL: str = "ollama_chat/mistral:7b-instruct-v0.3-q4_K_M"
    LLM_CAUSAL_MODEL: str = "ollama_chat/qwen2.5-coder:7b"   # analytical, temp 0
    LLM_FAST_MODEL: str = "ollama_chat/llama3.2:1b"          # cheap/quick calls
    LLM_EMBED_MODEL: str = "ollama/nomic-embed-text"         # vector embeddings

    LLM_REQUEST_TIMEOUT: int = 120  # seconds; CPU inference can be slow

    # When Ollama/hosted providers are unreachable (or explicitly set true), the
    # router falls back to a deterministic heuristic policy so simulations still
    # run end-to-end. Auto-detected when None (see `offline`).
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
    def use_ollama(self) -> bool:
        return self.LLM_PROVIDER.lower() == "ollama"

    @property
    def offline(self) -> bool:
        """
        Resolved offline flag.

        Explicit override wins. Otherwise: with the local Ollama provider we are
        never "offline" up front (the router attempts Ollama and only falls back
        to the heuristic policy if the call actually fails); with hosted
        providers we are offline when no usable API key is configured.
        """
        if self.LLM_OFFLINE_MODE is not None:
            return self.LLM_OFFLINE_MODE
        if self.use_ollama:
            return False
        return not self.has_llm_key

settings = Settings()


def get_settings() -> Settings:
    """Accessor used across the app (kept for dependency-injection call sites)."""
    return settings
