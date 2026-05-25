from groq import AsyncGroq
from typing import List, Dict
from app.config import settings
from app.llm.adapter import LLMProvider
from loguru import logger


class GroqProvider(LLMProvider):
    def __init__(self):
        if not settings.groq_api_key:
            raise ValueError("GROQ_API_KEY not set")
        self.client = AsyncGroq(api_key=settings.groq_api_key)
        self.model = settings.groq_model

    @property
    def name(self) -> str:
        return f"groq/{self.model}"

    async def chat(
        self,
        messages: List[Dict[str, str]],
        temperature: float = 0.3,
        max_tokens: int = 4096,
    ) -> Dict:
        try:
            response = await self.client.chat.completions.create(
                model=self.model,
                messages=messages,
                temperature=temperature,
                max_tokens=max_tokens,
            )
            content = response.choices[0].message.content
            tokens = response.usage.total_tokens if response.usage else 0
            return {
                "content": content,
                "tokens": tokens,
                "model": self.model,
            }
        except Exception as e:
            logger.error(f"Groq API error: {e}")
            raise