"""
Anomaly Detector — identifies vegetation stress and anomalies
from NDVI data using spatial statistics.

This is a rule-based MVP implementation.
Future: replace with a trained CNN/ViT model.
"""

import logging
from typing import List
import numpy as np
from scipy import ndimage

from models.schemas import DetectedAnomaly, AnomalyType, AnomalySeverity

logger = logging.getLogger("anomaly-detector")


class AnomalyDetector:
    """
    Rule-based anomaly detection on NDVI raster data.

    Detection pipeline:
      1. Compute spatial statistics
      2. Find low-NDVI clusters (potential disease/stress)
      3. Compare with global mean (local anomalies)
      4. Classify by severity
    """

    # Thresholds (tuned for Thailand rice/sugarcane in growing season)
    WATER_STRESS_NDVI_THRESHOLD = 0.2   # Below this = likely water stress
    DISEASE_CLUSTER_THRESHOLD = 0.15    # Cluster below this = disease risk
    CRITICAL_NDVI = 0.1                 # Below this = critical
    MIN_ANOMALY_AREA_PIXELS = 25        # Minimum cluster size to report

    def detect(
        self, ndvi_array: np.ndarray, crop_type: str = "rice"
    ) -> List[DetectedAnomaly]:
        """
        Detect anomalies in NDVI data.
        Returns list of detected anomalies (may be empty).
        """
        anomalies = []
        valid = ndvi_array[ndvi_array > -0.5]
        if valid.size == 0:
            return anomalies

        mean_ndvi = float(np.mean(valid))

        # --- 1. Overall water stress check ---
        if mean_ndvi < self.WATER_STRESS_NDVI_THRESHOLD:
            severity = (
                AnomalySeverity.CRITICAL
                if mean_ndvi < self.CRITICAL_NDVI
                else AnomalySeverity.WARNING
            )
            anomalies.append(DetectedAnomaly(
                anomaly_type=AnomalyType.WATER_STRESS,
                severity=severity,
                confidence=self._confidence_from_ndvi(mean_ndvi),
                description=(
                    f"ค่า NDVI เฉลี่ย {mean_ndvi:.2f} ต่ำกว่าเกณฑ์ปกติ "
                    f"อาจเกิดจากการขาดน้ำหรือความเครียดในพืช"
                ),
                recommendation=(
                    "ตรวจสอบระบบชลประทานและความชื้นในดิน "
                    "แนะนำให้ลงพื้นที่ตรวจสอบโดยตรงภายใน 48 ชั่วโมง"
                ),
            ))

        # --- 2. Spatial cluster detection ---
        stress_mask = ndvi_array < self.DISEASE_CLUSTER_THRESHOLD
        stress_mask[ndvi_array <= -0.5] = False  # Exclude no-data

        labeled, num_features = ndimage.label(stress_mask)

        for cluster_id in range(1, num_features + 1):
            cluster = labeled == cluster_id
            cluster_size = int(cluster.sum())

            if cluster_size < self.MIN_ANOMALY_AREA_PIXELS:
                continue

            cluster_ndvi = ndvi_array[cluster]
            cluster_mean = float(np.mean(cluster_ndvi))

            # Only report if significantly below field mean
            if cluster_mean < (mean_ndvi - 0.2):
                severity = self._classify_severity(cluster_mean, mean_ndvi)
                confidence = self._confidence_from_cluster(cluster_size, cluster_mean, mean_ndvi)

                area_sqm = cluster_size * 100  # Rough: 1 pixel ≈ 100m² at 10m res

                anomalies.append(DetectedAnomaly(
                    anomaly_type=AnomalyType.DISEASE_CLUSTER,
                    severity=severity,
                    confidence=confidence,
                    affected_area_sqm=area_sqm,
                    description=(
                        f"พบกลุ่มพืชผิดปกติขนาด {area_sqm:.0f} ตร.ม. "
                        f"ค่า NDVI ในบริเวณนี้ ({cluster_mean:.2f}) "
                        f"ต่ำกว่าค่าเฉลี่ยของแปลง ({mean_ndvi:.2f}) อย่างมีนัยสำคัญ"
                    ),
                    recommendation=(
                        "แนะนำให้สำรวจบริเวณที่ตรวจพบ "
                        "ตรวจหาสัญญาณโรคพืช, แมลงศัตรูพืช, "
                        "หรือการขาดธาตุอาหาร"
                    ),
                ))

                # Only report top 3 clusters to avoid alert fatigue
                if len(anomalies) >= 3:
                    break

        return anomalies

    def _classify_severity(
        self, cluster_ndvi: float, field_mean: float
    ) -> AnomalySeverity:
        delta = field_mean - cluster_ndvi
        if cluster_ndvi < self.CRITICAL_NDVI or delta > 0.35:
            return AnomalySeverity.CRITICAL
        elif delta > 0.2:
            return AnomalySeverity.WARNING
        else:
            return AnomalySeverity.WATCH

    def _confidence_from_ndvi(self, ndvi: float) -> float:
        """Lower NDVI = higher confidence that something is wrong"""
        if ndvi < 0.05:
            return 0.95
        elif ndvi < 0.1:
            return 0.85
        elif ndvi < 0.2:
            return 0.70
        else:
            return 0.55

    def _confidence_from_cluster(
        self, size: int, cluster_ndvi: float, field_mean: float
    ) -> float:
        """Larger clusters with bigger NDVI delta = higher confidence"""
        size_score = min(1.0, size / 200)  # Max confidence at 200 pixels
        delta_score = min(1.0, (field_mean - cluster_ndvi) / 0.4)
        return round((size_score + delta_score) / 2, 2)
