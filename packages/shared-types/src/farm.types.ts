// ============================================================
// Farm & Field Types
// Used across: API, Bot, LIFF
// ============================================================

/** GeoJSON polygon geometry for farm boundaries */
export interface GeoPolygon {
  type: "Polygon";
  coordinates: [number, number][][]; // [lng, lat]
}

/** GeoJSON point for GPS observations */
export interface GeoPoint {
  type: "Point";
  coordinates: [number, number]; // [lng, lat]
}

/** Supported crop types in Thailand/SEA */
export type CropType =
  | "rice"
  | "sugarcane"
  | "cassava"
  | "corn"
  | "rubber"
  | "durian"
  | "mango"
  | "longan"
  | "pineapple"
  | "vegetable"
  | "other";

/** Thai provinces for farm registration */
export type ThaiProvince = string;

/** Core farm record */
export interface Farm {
  id: string;
  owner_id: string; // Supabase user ID
  line_user_id: string; // LINE user ID (uXXXXXX)
  name: string;
  crop_type: CropType;
  province: ThaiProvince;
  polygon: GeoPolygon | null;
  area_rai: number | null; // Thai land unit: 1 rai = 1600 m²
  area_sqm: number | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  metadata: Record<string, unknown>;
}

/** Observation types for field scouting */
export type ObservationType =
  | "disease"
  | "pest"
  | "nutrient_deficiency"
  | "irrigation"
  | "weed"
  | "general"
  | "harvest_ready";

/** Severity levels */
export type Severity = "low" | "medium" | "high" | "critical";

/** A single field observation (offline-first) */
export interface FieldObservation {
  id: string;
  farm_id: string;
  line_user_id: string;
  location: GeoPoint;
  observation_type: ObservationType;
  severity: Severity | null;
  description: string | null;
  image_urls: string[];
  voice_note_url: string | null;
  labels: string[];
  ai_verified: boolean;
  farmer_verified: boolean;
  created_at: string;
  synced_at: string | null; // null = not yet synced to server
  // Offline-only fields (not stored on server)
  local_id?: string; // IndexedDB ID before server sync
  pending_upload?: boolean;
}

/** Harvest record */
export interface HarvestLog {
  id: string;
  farm_id: string;
  harvest_date: string;
  crop_type: CropType;
  estimated_yield_kg: number | null;
  actual_yield_kg: number | null;
  quality_notes: string | null;
  price_per_kg: number | null;
  total_revenue: number | null;
  notes: string | null;
  created_at: string;
}

/** Onboarding state tracked in LINE bot session */
export interface OnboardingState {
  step:
    | "welcome"
    | "farm_name"
    | "crop_type"
    | "province"
    | "farm_size"
    | "draw_boundary"
    | "complete";
  farm_name?: string;
  crop_type?: CropType;
  province?: ThaiProvince;
  farm_size_rai?: number;
  line_user_id: string;
}
