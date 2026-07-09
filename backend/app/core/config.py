from pydantic_settings import BaseSettings, SettingsConfigDict
from pydantic import model_validator
from functools import lru_cache
from pathlib import Path


def _read_from_env_file(key: str) -> str:
    """Read a key directly from .env file, bypassing system environment variables."""
    env_path = Path(__file__).parent.parent.parent / ".env"
    if env_path.exists():
        for line in env_path.read_text(encoding="utf-8").splitlines():
            line = line.strip()
            if line.startswith("#") or "=" not in line:
                continue
            k, _, v = line.partition("=")
            if k.strip().upper() == key.upper():
                return v.strip()
    return ""


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
    )

    # Azure OpenAI
    azure_openai_endpoint: str = ""
    azure_openai_api_key: str = ""
    azure_openai_key: str = ""
    azure_openai_deployment: str = "gpt-4o"
    azure_openai_api_version: str = "2024-12-01-preview"
    azure_openai_max_tokens: int = 16000

    # Figma
    figma_access_token: str = ""
    figma_api_base: str = "https://api.figma.com/v1"

    # Storage
    storage_backend: str = "local"
    local_history_dir: str = "./data/history"
    max_history_items: int = 200

    # Security
    api_key: str = ""  # Optional API key for endpoint protection
    cors_origins: list[str] = [
        "http://localhost:3000",
        "http://localhost:3001",
        "http://localhost:5173",
        "http://localhost:8002",
    ]

    # Rate limiting
    rate_limit_per_minute: int = 30
    generation_rate_limit_per_minute: int = 10

    # Application
    app_version: str = "2.0.0"
    environment: str = "development"
    log_level: str = "INFO"

    @model_validator(mode="after")
    def resolve_api_key(self) -> "Settings":
        # Always read the API key directly from .env file to prevent
        # stale system environment variables from overriding it
        file_key = (
            _read_from_env_file("AZURE_OPENAI_API_KEY")
            or _read_from_env_file("AZURE_OPENAI_KEY")
        )
        if file_key:
            self.azure_openai_api_key = file_key
        elif self.azure_openai_key:
            self.azure_openai_api_key = self.azure_openai_key
        return self


@lru_cache
def get_settings() -> Settings:
    return Settings()


def reload_settings() -> Settings:
    """Clear cached settings and reload from .env file."""
    get_settings.cache_clear()
    return get_settings()
