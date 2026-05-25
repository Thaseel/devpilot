from typing import List, Dict, Optional
from app.llm.adapter import LLMProvider, get_provider
from app.prompts.system_prompts import get_prompt
from loguru import logger


class BaseAgent:
    """Base class for all DevPilot agents."""

    def __init__(self, agent_type: str, provider: Optional[LLMProvider] = None):
        self.agent_type = agent_type
        self.provider = provider or get_provider()
        self.system_prompt = get_prompt(agent_type)

    def build_messages(
        self,
        user_message: str,
        history: Optional[List[Dict]] = None,
    ) -> List[Dict[str, str]]:
        messages = [{"role": "system", "content": self.system_prompt}]
        if history:
            for h in history[-10:]:  # last 10 only to save tokens
                messages.append({"role": h["role"], "content": h["content"]})
        messages.append({"role": "user", "content": user_message})
        return messages

    async def run(
        self,
        user_message: str,
        history: Optional[List[Dict]] = None,
        temperature: float = 0.3,
    ) -> Dict:
        messages = self.build_messages(user_message, history)
        logger.info(f"[{self.agent_type}] Calling {self.provider.name}")
        result = await self.provider.chat(messages, temperature=temperature)
        return {
            "reply": result["content"],
            "agent_used": self.agent_type,
            "model_used": result["model"],
            "tokens_used": result["tokens"],
        }