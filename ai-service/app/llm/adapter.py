from abc import ABC, abstractmethod
from typing import List, Dict, Optional


class LLMProvider(ABC):
    """Abstract base for any LLM provider."""

    @abstractmethod
    async def chat(
        self,
        messages: List[Dict[str, str]],
        temperature: float = 0.3,
        max_tokens: int = 4096,
    ) -> Dict:
        """
        Returns dict: { 'content': str, 'tokens': int, 'model': str }
        """
        pass

    @property
    @abstractmethod
    def name(self) -> str:
        pass


def get_provider() -> LLMProvider:
    """Factory: pick provider based on config."""
    from app.config import settings
    from app.llm.groq_provider import GroqProvider
    from app.llm.gemini_provider import GeminiProvider

    if settings.llm_provider == "groq":
        return GroqProvider()
    elif settings.llm_provider == "gemini":
        return GeminiProvider()
    else:
        raise ValueError(f"Unknown provider: {settings.llm_provider}")