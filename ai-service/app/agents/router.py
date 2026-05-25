from app.agents.base import BaseAgent
from loguru import logger


VALID_AGENTS = {"functional", "cap", "ui5", "abap", "debug", "general"}


class RouterAgent(BaseAgent):
    def __init__(self):
        super().__init__("router")

    async def classify(self, user_message: str) -> str:
        result = await self.run(user_message, temperature=0.0)
        choice = result["reply"].strip().lower().split()[0] if result["reply"].strip() else "general"
        # Clean any punctuation
        choice = choice.strip(".,!?\"'")
        if choice not in VALID_AGENTS:
            logger.warning(f"Router returned invalid agent '{choice}', defaulting to general")
            choice = "general"
        return choice