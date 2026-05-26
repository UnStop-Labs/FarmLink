"""Application configuration from environment variables"""

from pydantic_settings import BaseSettings
from typing import List


class Settings(BaseSettings):
    # Server
    port: int = 8000
    debug: bool = True

    # Sentinel Hub (get credentials from sentinelhub.com)
    sentinel_hub_client_id: str = ""
    sentinel_hub_client_secret: str = ""
    sentinel_hub_instance_id: str = ""

    # AWS S3 (for storing processed images)
    aws_region: str = "ap-southeast-1"
    aws_access_key_id: str = "localstack"
    aws_secret_access_key: str = "localstack"
    aws_s3_bucket: str = "farmlink-media"
    aws_endpoint_url: str = "http://localhost:4566"

    # Supabase
    supabase_url: str = ""
    supabase_service_role_key: str = ""

    # Redis (for Celery task queue)
    redis_url: str = "redis://localhost:6379"

    # CORS
    cors_origins: List[str] = ["http://localhost:3000", "http://localhost:3001", "http://localhost:3002"]

    class Config:
        env_file = "../../.env"
        env_file_encoding = "utf-8"
        extra = "ignore"


settings = Settings()
