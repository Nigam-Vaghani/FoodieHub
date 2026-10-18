import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from src.config import settings
from src.database import init_db
from src.routes import router

logging.basicConfig(
    level=settings.LOG_LEVEL,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s"
)
logger = logging.getLogger("delivery-service")

@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Initializing Delivery Service database...")
    init_db()
    logger.info("Delivery Service successfully initialized and ready.")
    yield
    logger.info("Shutting down Delivery Service...")

app = FastAPI(
    title="FoodieHub - Delivery Service",
    description="Delivery Assignment and Real-Time Tracking Microservice for FoodieHub",
    version="1.0.0",
    lifespan=lifespan
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(router)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("src.main:app", host="0.0.0.0", port=settings.SERVICE_PORT, reload=True)
