from pydantic_settings import BaseSettings, SettingsConfigDict
from typing import Literal


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    # LLM Provider selection
    llm_provider: Literal["groq", "gemini"] = "groq"

    # Groq
    groq_api_key: str = "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"
    groq_model: str = "llama-3.3-70b-versatile"

    # Gemini
    gemini_api_key: str = ""
    gemini_model: str = "gemini-2.0-flash"

    # Service
    port: int = 8000
    log_level: str = "INFO"


settings = Settings()