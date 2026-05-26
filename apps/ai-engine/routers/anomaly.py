"""Anomaly feedback and reanalysis endpoints"""

import logging
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional

logger = logging.getLogger("anomaly-router")
router = APIRouter()


class FeedbackRequest(BaseModel):
    anomaly_id: str
    farm_id: str
    confirmed: bool
    actual_observation: Optional[str] = None
    disease_type: Optional[str] = None


@router.post("/feedback")
async def submit_feedback(request: FeedbackRequest):
    """
    Receive farmer feedback on AI anomaly detection.
    This data is stored as labeled training examples for future model improvement.
    """
    logger.info(
        f"Feedback: anomaly={request.anomaly_id}, "
        f"confirmed={request.confirmed}, farm={request.farm_id}"
    )

    # TODO: Store in training dataset table
    # TODO: Trigger model fine-tuning if enough labeled data accumulates

    return {
        "status": "received",
        "message": "ขอบคุณสำหรับข้อมูล! ระบบ AI จะเรียนรู้จากข้อมูลของคุณ",
    }
