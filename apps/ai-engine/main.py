"""
FarmLink AI Engine — FastAPI application
Handles satellite imagery processing and NDVI analysis
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
import logging

from config import settings
from routers import ndvi, anomaly, health

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("farmlink-ai")


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("🛰️  FarmLink AI Engine starting up...")
    yield
    logger.info("AI Engine shutting down...")


app = FastAPI(
    title="FarmLink AI Engine",
    description="Satellite imagery processing and agricultural AI for FarmLink",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register routers
app.include_router(health.router, prefix="/api", tags=["Health"])
app.include_router(ndvi.router, prefix="/api/ndvi", tags=["NDVI"])
app.include_router(anomaly.router, prefix="/api/anomaly", tags=["Anomaly"])


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=settings.port,
        reload=settings.debug,
    )
