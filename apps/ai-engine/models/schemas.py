"""Pydantic schemas for AI Engine API"""

from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from datetime import datetime
from enum import Enum


class AnomalyType(str, Enum):
    WATER_STRESS = "water_stress"
    DISEASE_CLUSTER = "disease_cluster"
    NUTRIENT_DEFICIENCY = "nutrient_deficiency"
    FLOODING = "flooding"
    DROUGHT = "drought"
    CROP_DAMAGE = "crop_damage"
    UNUSUAL_GROWTH = "unusual_growth"


class AnomalySeverity(str, Enum):
    WATCH = "watch"
    WARNING = "warning"
    CRITICAL = "critical"


class NDVITrend(str, Enum):
    IMPROVING = "improving"
    STABLE = "stable"
    DECLINING = "declining"
    UNKNOWN = "unknown"


class GeoPolygon(BaseModel):
    type: str = "Polygon"
    coordinates: List[List[List[float]]]


class AnalysisRequest(BaseModel):
    farm_id: str
    geometry: Optional[GeoPolygon] = None
    crop_type: Optional[str] = "rice"
    date_from: Optional[str] = None
    date_to: Optional[str] = None
    source: Optional[str] = "sentinel-2"


class DetectedAnomaly(BaseModel):
    anomaly_type: AnomalyType
    severity: AnomalySeverity
    confidence: float = Field(ge=0, le=1)
    affected_area_sqm: Optional[float] = None
    description: str
    recommendation: str
    location: Optional[Dict[str, Any]] = None


class AnalysisResult(BaseModel):
    farm_id: str
    source: str = "sentinel-2"
    captured_at: str
    cloud_cover_percent: float = Field(ge=0, le=100)

    # NDVI
    ndvi_mean: float = Field(ge=-1, le=1)
    ndvi_min: float = Field(ge=-1, le=1)
    ndvi_max: float = Field(ge=-1, le=1)
    ndvi_trend: NDVITrend = NDVITrend.UNKNOWN

    # Stress indices (0-1, higher = more stress)
    water_stress_index: Optional[float] = Field(None, ge=0, le=1)
    chlorophyll_index: Optional[float] = Field(None, ge=0, le=1)

    # Image URLs (stored in S3)
    true_color_url: Optional[str] = None
    ndvi_overlay_url: Optional[str] = None
    false_color_url: Optional[str] = None

    # Detected anomalies
    anomalies: List[DetectedAnomaly] = []


class HealthCheck(BaseModel):
    status: str = "ok"
    version: str = "1.0.0"
    services: Dict[str, str] = {}
