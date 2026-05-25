import google.generativeai as genai
from typing import List, Dict
from app.config import settings
from app.llm.adapter import LLMProvider
from loguru import logger


class GeminiProvider(LLMProvider):
    def __init__(self):
        if not settings.gemini_api_key:
            raise ValueError("GEMINI_API_KEY not set")
        genai.configure(api_key=settings.gemini_api_key)
        self.model_name = settings.gemini_model

    @property
    def name(self) -> str:
        return f"gemini/{self.model_name}"

    async def chat(
        self,
        messages: List[Dict[str, str]],
        temperature: float = 0.3,
        max_tokens: int = 4096,
    ) -> Dict:
        try:
            # Gemini uses different format
            system_instruction = None
            history = []
            for msg in messages:
                if msg["role"] == "system":
                    system_instruction = msg["content"]
                elif msg["role"] == "user":
                    history.append({"role": "user", "parts": [msg["content"]]})
                elif msg["role"] == "assistant":
                    history.append({"role": "model", "parts": [msg["content"]]})

            model = genai.GenerativeModel(
                model_name=self.model_name,
                system_instruction=system_instruction,
            )

            # Last message is current; rest is history
            if not history:
                raise ValueError("No user messages")

            last = history[-1]
            chat = model.start_chat(history=history[:-1])
            response = await chat.send_message_async(
                last["parts"][0],
                generation_config={
                    "temperature": temperature,
                    "max_output_tokens": max_tokens,
                },
            )

            tokens = 0
            try:
                tokens = response.usage_metadata.total_token_count
            except Exception:
                pass

            return {
                "content": response.text,
                "tokens": tokens,
                "model": self.model_name,
            }
        except Exception as e:
            logger.error(f"Gemini API error: {e}")
            raise