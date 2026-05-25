from app.agents.base import BaseAgent

class DebugAgent(BaseAgent):
    def __init__(self):
        super().__init__("debug")