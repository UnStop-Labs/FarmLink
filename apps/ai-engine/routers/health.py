"""Health check endpoints"""

from fastapi import APIRouter
from models.schemas import HealthCheck
from config import settings

router = APIRouter()


@router.get("/health", response_model=HealthCheck)
async def health_check():
    services = {
        "sentinel_hub": "configured" if settings.sentinel_hub_client_id else "stub_mode",
        "s3": "localstack" if "localhost" in settings.aws_endpoint_url else "aws",
        "redis": "configured",
    }
    return HealthCheck(status="ok", services=services)
