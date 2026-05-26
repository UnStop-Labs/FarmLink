"""S3 storage service for processed satellite images"""

import logging
import boto3
from botocore.exceptions import ClientError
from config import settings

logger = logging.getLogger("storage")


class StorageService:
    def __init__(self):
        kwargs = {
            "region_name": settings.aws_region,
            "aws_access_key_id": settings.aws_access_key_id,
            "aws_secret_access_key": settings.aws_secret_access_key,
        }
        if settings.aws_endpoint_url:
            kwargs["endpoint_url"] = settings.aws_endpoint_url

        self.s3 = boto3.client("s3", **kwargs)
        self.bucket = settings.aws_s3_bucket

    async def upload_image(
        self, key: str, image_bytes: bytes, content_type: str = "image/png"
    ) -> str:
        """Upload image bytes to S3, return public URL"""
        try:
            self.s3.put_object(
                Bucket=self.bucket,
                Key=key,
                Body=image_bytes,
                ContentType=content_type,
            )

            if settings.aws_endpoint_url:
                return f"{settings.aws_endpoint_url}/{self.bucket}/{key}"

            return (
                f"https://{self.bucket}.s3.{settings.aws_region}.amazonaws.com/{key}"
            )
        except ClientError as e:
            logger.error(f"Failed to upload {key}: {e}")
            raise
