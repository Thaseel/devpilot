from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from loguru import logger
import sys

from app.config import settings
from app.models import ChatRequest, ChatResponse, HealthResponse
from app.agents.orchestrator import Orchestrator
from app.llm.adapter import get_provider


# Configure logging
logger.remove()
logger.add(sys.stderr, level=settings.log_level)


orchestrator: Orchestrator = None


@asynccontextmanager
async def lifespan(app: FastAPI):
    global orchestrator
    logger.info("🚀 Starting DevPilot AI Service")
    logger.info(f"LLM Provider: {settings.llm_provider}")
    orchestrator = Orchestrator()
    yield
    logger.info("👋 Shutting down")


app = FastAPI(
    title="DevPilot AI Service",
    version="0.1.0",
    description="Multi-agent AI service for SAP developers",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health", response_model=HealthResponse)
async def health():
    provider = get_provider()
    return HealthResponse(
        status="ok",
        provider=settings.llm_provider,
        model=provider.name,
    )


@app.post("/chat", response_model=ChatResponse)
async def chat(req: ChatRequest):
    try:
        history = [m.model_dump() for m in req.history]
        result = await orchestrator.handle(
            message=req.message,
            history=history,
            agent_type=req.agent_type or "auto",
        )
        return ChatResponse(
            reply=result["reply"],
            agent_used=result["agent_used"],
            model_used=result["model_used"],
            tokens_used=result.get("tokens_used"),
        )
    except Exception as e:
        logger.exception("Chat failed")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/")
async def root():
    return {
        "service": "DevPilot AI",
        "version": "0.1.0",
        "endpoints": ["/health", "/chat", "/docs"],
    }