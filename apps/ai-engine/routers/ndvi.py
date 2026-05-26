"""NDVI analysis endpoints"""

import logging
import uuid
from datetime import datetime
from fastapi import APIRouter, HTTPException

from models.schemas import AnalysisRequest, AnalysisResult
from services.sentinel_hub import SentinelHubService
from services.ndvi_processor import NDVIProcessor
from services.anomaly_detector import AnomalyDetector
from services.storage import StorageService

logger = logging.getLogger("ndvi-router")
router = APIRouter()

# Service instances (singleton pattern)
sentinel = SentinelHubService()
processor = NDVIProcessor()
detector = AnomalyDetector()
storage = StorageService()


@router.post("/analyze", response_model=AnalysisResult)
async def analyze_farm(request: AnalysisRequest):
    """
    Full satellite analysis pipeline:
      1. Fetch imagery from Sentinel Hub
      2. Compute NDVI statistics
      3. Generate visualization images
      4. Detect anomalies
      5. Upload images to S3
      6. Return structured results
    """
    logger.info(f"Analyzing farm {request.farm_id}")

    try:
        # 1. Fetch satellite data
        raw_data = await sentinel.fetch_ndvi_data(
            geometry_geojson=request.geometry.model_dump() if request.geometry else {},
            date_from=request.date_from,
            date_to=request.date_to,
        )

        ndvi_array = raw_data["ndvi_array"]
        captured_at = raw_data.get("captured_at", datetime.utcnow().isoformat())

        # 2. Compute NDVI stats
        stats = processor.compute_stats(ndvi_array)
        water_stress = processor.compute_water_stress_index(ndvi_array)

        # 3. Determine trend (would normally compare with previous snapshot)
        # For MVP, we'll just return "unknown" without historical comparison
        trend = "unknown"

        # 4. Generate overlay image
        overlay_bytes = processor.generate_ndvi_overlay(ndvi_array)
        overlay_key = f"satellite/{request.farm_id}/{uuid.uuid4()}-ndvi.png"

        # 5. Upload to S3
        ndvi_overlay_url = await storage.upload_image(
            overlay_key, overlay_bytes, "image/png"
        )

        # 6. Detect anomalies
        anomalies = detector.detect(ndvi_array, request.crop_type or "rice")

        logger.info(
            f"Farm {request.farm_id}: NDVI={stats['ndvi_mean']:.3f}, "
            f"anomalies={len(anomalies)}"
        )

        return AnalysisResult(
            farm_id=request.farm_id,
            source=raw_data.get("source", "sentinel-2"),
            captured_at=captured_at,
            cloud_cover_percent=raw_data.get("cloud_cover_percent", 0),
            ndvi_mean=stats["ndvi_mean"],
            ndvi_min=stats["ndvi_min"],
            ndvi_max=stats["ndvi_max"],
            ndvi_trend=trend,
            water_stress_index=water_stress,
            ndvi_overlay_url=ndvi_overlay_url,
            anomalies=anomalies,
        )

    except Exception as e:
        logger.error(f"Analysis failed for farm {request.farm_id}: {e}")
        raise HTTPException(status_code=500, detail=f"Analysis failed: {str(e)}")


@router.get("/farm/{farm_id}/latest")
async def get_latest_ndvi(farm_id: str):
    """Quick NDVI fetch without full analysis (uses stub data)"""
    raw_data = await sentinel.fetch_ndvi_data({})
    stats = processor.compute_stats(raw_data["ndvi_array"])
    return {
        "farm_id": farm_id,
        "ndvi_mean": stats["ndvi_mean"],
        "captured_at": raw_data["captured_at"],
        "source": raw_data["source"],
    }
