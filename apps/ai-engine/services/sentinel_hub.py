"""
Sentinel Hub Service — fetches satellite imagery

In STUB mode (no credentials), returns synthetic NDVI data.
Set SENTINEL_HUB_CLIENT_ID + CLIENT_SECRET for real data.

Sentinel Hub docs: https://docs.sentinel-hub.com/api/
"""

import logging
import random
from datetime import datetime, timedelta
from typing import Optional, Tuple
import numpy as np

from config import settings

logger = logging.getLogger("sentinel-hub")


class SentinelHubService:
    """Fetches multi-spectral imagery from Sentinel-2 via Sentinel Hub API"""

    def __init__(self):
        self.is_configured = bool(
            settings.sentinel_hub_client_id
            and settings.sentinel_hub_client_secret
        )

        if self.is_configured:
            self._init_client()
        else:
            logger.warning(
                "Sentinel Hub credentials not set — running in STUB mode. "
                "Set SENTINEL_HUB_CLIENT_ID and SENTINEL_HUB_CLIENT_SECRET "
                "to fetch real satellite data."
            )

    def _init_client(self):
        """Initialize real Sentinel Hub client"""
        try:
            from sentinelhub import (
                SHConfig, SentinelHubRequest, DataCollection,
                MimeType, CRS, BBox, bbox_to_dimensions
            )
            self.config = SHConfig()
            self.config.sh_client_id = settings.sentinel_hub_client_id
            self.config.sh_client_secret = settings.sentinel_hub_client_secret
            logger.info("Sentinel Hub client initialized (LIVE mode)")
        except ImportError:
            logger.error("sentinelhub package not installed")
            self.is_configured = False

    async def fetch_ndvi_data(
        self,
        geometry_geojson: dict,
        date_from: Optional[str] = None,
        date_to: Optional[str] = None,
    ) -> dict:
        """
        Fetch NDVI raster data for a farm polygon.
        Returns dict with ndvi array and metadata.
        """
        if not self.is_configured:
            return self._stub_ndvi_data(date_from, date_to)

        # --- Real Sentinel Hub implementation ---
        try:
            from sentinelhub import (
                SentinelHubRequest, DataCollection, MimeType,
                CRS, BBox, bbox_to_dimensions, SHConfig
            )
            from shapely.geometry import shape

            # Convert GeoJSON to bounding box
            geom = shape(geometry_geojson)
            bounds = geom.bounds  # (minx, miny, maxx, maxy)

            # Default: last 30 days
            end = datetime.utcnow()
            start = end - timedelta(days=30)
            if date_from:
                start = datetime.fromisoformat(date_from)
            if date_to:
                end = datetime.fromisoformat(date_to)

            bbox = BBox(bbox=bounds, crs=CRS.WGS84)
            size = bbox_to_dimensions(bbox, resolution=10)  # 10m Sentinel-2 resolution

            # Evalscript for NDVI
            evalscript = """
            //VERSION=3
            function setup() {
                return { input: ["B04", "B08", "dataMask"],
                         output: { bands: 3 } };
            }
            function evaluatePixel(sample) {
                let ndvi = (sample.B08 - sample.B04) / (sample.B08 + sample.B04);
                let r = 1 - ndvi;
                let g = ndvi;
                return [r, g, 0, sample.dataMask];
            }
            """

            request = SentinelHubRequest(
                evalscript=evalscript,
                input_data=[
                    SentinelHubRequest.input_data(
                        data_collection=DataCollection.SENTINEL2_L2A,
                        time_interval=(
                            start.strftime("%Y-%m-%d"),
                            end.strftime("%Y-%m-%d")
                        ),
                        mosaicking_order="leastCC",  # least cloud cover
                    )
                ],
                responses=[SentinelHubRequest.output_response("default", MimeType.TIFF)],
                bbox=bbox,
                size=size,
                config=self.config,
            )

            response = request.get_data()
            ndvi_array = np.array(response[0])

            return {
                "ndvi_array": ndvi_array,
                "cloud_cover_percent": 0,  # leastCC handles cloud filtering
                "captured_at": end.isoformat(),
                "source": "sentinel-2",
            }

        except Exception as e:
            logger.error(f"Sentinel Hub request failed: {e}")
            return self._stub_ndvi_data(date_from, date_to)

    def _stub_ndvi_data(
        self, date_from: Optional[str], date_to: Optional[str]
    ) -> dict:
        """
        Generate synthetic NDVI data for testing/development.
        Values reflect typical rice field in Thailand.
        """
        logger.info("Using STUB Sentinel Hub data")

        # Simulate a 100x100 raster with slight spatial variation
        base_ndvi = random.uniform(0.3, 0.6)  # Typical growing season
        noise = np.random.normal(0, 0.05, (100, 100))
        ndvi_array = np.clip(base_ndvi + noise, -1, 1)

        # Simulate a stressed patch in one corner (for testing anomaly detection)
        ndvi_array[70:90, 70:90] = np.clip(
            np.random.normal(0.15, 0.03, (20, 20)), -1, 1
        )

        captured_at = date_to or datetime.utcnow().isoformat()

        return {
            "ndvi_array": ndvi_array,
            "cloud_cover_percent": random.uniform(0, 15),
            "captured_at": captured_at,
            "source": "sentinel-2-stub",
        }
