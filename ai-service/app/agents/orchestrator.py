from typing import List, Dict, Optional
from app.agents.router import RouterAgent
from app.agents.cap_agent import CAPAgent
from app.agents.ui5_agent import UI5Agent
from app.agents.abap_agent import ABAPAgent
from app.agents.debug_agent import DebugAgent
from app.agents.functional_agent import FunctionalAgent
from app.agents.general_agent import GeneralAgent
from loguru import logger


class Orchestrator:
    def __init__(self):
        self.router = RouterAgent()
        self.agents = {
            "cap": CAPAgent(),
            "ui5": UI5Agent(),
            "abap": ABAPAgent(),
            "debug": DebugAgent(),
            "functional": FunctionalAgent(),
            "general": GeneralAgent(),
        }

    async def handle(
        self,
        message: str,
        history: Optional[List[Dict]] = None,
        agent_type: str = "auto",
    ) -> Dict:

        # Decide which agent
        if agent_type == "auto":
            chosen = await self.router.classify(message)
            logger.info(f"Router chose: {chosen}")
        else:
            chosen = agent_type if agent_type in self.agents else "general"

        agent = self.agents[chosen]
        result = await agent.run(message, history=history)
        return result