// ============================================================
// Satellite & Geospatial Types
// ============================================================

/** Satellite data sources */
export type SatelliteSource =
  | "sentinel-2"
  | "landsat-8"
  | "landsat-9"
  | "planet";

/** NDVI score: -1 (no vegetation) to 1 (dense vegetation) */
export type NDVIScore = number;

/** Anomaly types detected by satellite analysis */
export type AnomalyType =
  | "water_stress"
  | "disease_cluster"
  | "nutrient_deficiency"
  | "flooding"
  | "drought"
  | "crop_damage"
  | "unusual_growth";

/** Anomaly severity */
export type AnomalySeverity = "watch" | "warning" | "critical";

/** A satellite snapshot for a specific farm */
export interface SatelliteSnapshot {
  id: string;
  farm_id: string;
  source: SatelliteSource;
  captured_at: string;
  processed_at: string;
  cloud_cover_percent: number;

  // NDVI analysis
  ndvi_mean: NDVIScore;
  ndvi_min: NDVIScore;
  ndvi_max: NDVIScore;
  ndvi_trend: "improving" | "stable" | "declining" | "unknown";

  // Stress indices
  water_stress_index: number | null; // 0-1
  chlorophyll_index: number | null;

  // Image URLs (stored in S3)
  true_color_url: string | null;
  ndvi_overlay_url: string | null;
  false_color_url: string | null;

  // Detected anomalies
  anomalies: Anomaly[];

  // Raw data reference
  raw_data_url: string | null;
}

/** A detected anomaly within a satellite snapshot */
export interface Anomaly {
  id: string;
  snapshot_id: string;
  farm_id: string;
  anomaly_type: AnomalyType;
  severity: AnomalySeverity;
  confidence: number; // 0-1
  affected_area_sqm: number | null;
  location: {
    type: "Polygon" | "Point";
    coordinates: unknown;
  };
  description: string;
  recommendation: string;
  notified_at: string | null;
  farmer_confirmed: boolean | null;
  farmer_feedback: string | null;
}

/** Farmer response to an AI anomaly detection */
export interface AnomalyFeedback {
  anomaly_id: string;
  farm_id: string;
  line_user_id: string;
  confirmed: boolean;
  actual_observation: string | null;
  image_urls: string[];
  feedback_at: string;
}

/** NDVI time series for trend analysis */
export interface NDVITimeSeries {
  farm_id: string;
  data_points: Array<{
    date: string;
    ndvi_mean: NDVIScore;
    ndvi_min: NDVIScore;
    ndvi_max: NDVIScore;
    cloud_cover_percent: number;
  }>;
}
