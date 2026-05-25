from pydantic import BaseModel, Field
from typing import Optional, List, Literal
from datetime import datetime


class Message(BaseModel):
    role: Literal["system", "user", "assistant"]
    content: str


class ChatRequest(BaseModel):
    message: str = Field(..., description="User message")
    conversation_id: Optional[str] = None
    history: List[Message] = Field(default_factory=list, description="Previous messages")
    agent_type: Optional[str] = Field(default="auto", description="auto | cap | ui5 | abap | debug | functional")
    user_role: Optional[str] = Field(default="developer", description="developer | functional | technical")


class ChatResponse(BaseModel):
    reply: str
    agent_used: str
    model_used: str
    tokens_used: Optional[int] = None
    artifacts: Optional[List[dict]] = None  # Generated code/files
    timestamp: datetime = Field(default_factory=datetime.utcnow)


class HealthResponse(BaseModel):
    status: str
    provider: str
    model: str