"""
NDVI Processor — computes vegetation indices from satellite data
and generates visualization images.
"""

import logging
import io
from typing import Optional, Tuple
import numpy as np
from PIL import Image

logger = logging.getLogger("ndvi-processor")


class NDVIProcessor:
    """Processes NDVI raster arrays into metrics and visualization images"""

    def compute_stats(self, ndvi_array: np.ndarray) -> dict:
        """Compute NDVI statistics from a 2D raster array"""
        # Mask out no-data pixels (often -1 or exactly 0 in masked areas)
        valid = ndvi_array[ndvi_array > -0.5]

        if valid.size == 0:
            return {
                "ndvi_mean": 0.0,
                "ndvi_min": 0.0,
                "ndvi_max": 0.0,
            }

        return {
            "ndvi_mean": float(np.mean(valid)),
            "ndvi_min": float(np.min(valid)),
            "ndvi_max": float(np.max(valid)),
        }

    def compute_water_stress_index(self, ndvi_array: np.ndarray) -> float:
        """
        Simplified Water Stress Index (WSI).
        In a real implementation, this would use SWIR bands (B11, B12).
        Here we derive a proxy from NDVI — low NDVI during growing season
        often correlates with water stress.
        """
        mean_ndvi = float(np.mean(ndvi_array[ndvi_array > -0.5]))
        # Invert and normalize: high NDVI = low stress
        wsi = max(0, min(1, (0.5 - mean_ndvi) / 0.5))
        return round(wsi, 4)

    def determine_trend(
        self,
        current_ndvi: float,
        previous_ndvi: Optional[float]
    ) -> str:
        """Determine NDVI trend vs previous snapshot"""
        if previous_ndvi is None:
            return "unknown"

        delta = current_ndvi - previous_ndvi
        if delta > 0.05:
            return "improving"
        elif delta < -0.05:
            return "declining"
        else:
            return "stable"

    def generate_ndvi_overlay(self, ndvi_array: np.ndarray) -> bytes:
        """
        Generate a color-coded NDVI overlay PNG.
        Color scale: red (stressed) → yellow → green (healthy)
        Returns PNG bytes for S3 upload.
        """
        height, width = ndvi_array.shape[:2]

        # Normalize NDVI to 0-1 for colorization
        normalized = (ndvi_array - (-0.5)) / (1.0 - (-0.5))
        normalized = np.clip(normalized, 0, 1)

        # Apply color map
        r = np.uint8(255 * np.clip(2 * (1 - normalized), 0, 1))
        g = np.uint8(255 * np.clip(2 * normalized, 0, 1))
        b = np.zeros((height, width), dtype=np.uint8)
        a = np.full((height, width), 180, dtype=np.uint8)  # semi-transparent

        rgba = np.stack([r, g, b, a], axis=-1)
        img = Image.fromarray(rgba, "RGBA")

        # Scale up for visibility (keep it small for bandwidth)
        img = img.resize((512, 512), Image.NEAREST)

        buffer = io.BytesIO()
        img.save(buffer, format="PNG", optimize=True)
        return buffer.getvalue()

    def generate_true_color(
        self, red_band: np.ndarray, green_band: np.ndarray, blue_band: np.ndarray
    ) -> bytes:
        """Generate a true-color composite PNG"""
        def normalize(band: np.ndarray) -> np.ndarray:
            p2, p98 = np.percentile(band, (2, 98))
            stretched = (band - p2) / (p98 - p2 + 1e-10)
            return np.uint8(np.clip(stretched * 255, 0, 255))

        rgb = np.stack([
            normalize(red_band),
            normalize(green_band),
            normalize(blue_band),
        ], axis=-1)

        img = Image.fromarray(rgb, "RGB")
        img = img.resize((512, 512), Image.LANCZOS)

        buffer = io.BytesIO()
        img.save(buffer, format="JPEG", quality=85)
        return buffer.getvalue()
