// ============================================================
// API Request/Response Types
// ============================================================

import type { Farm, FieldObservation, HarvestLog, CropType } from "./farm.types";
import type { SatelliteSnapshot, AnomalyFeedback } from "./satellite.types";

// --- Generic ---

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  has_more: boolean;
}

export interface ApiError {
  statusCode: number;
  message: string;
  error?: string;
}

// --- Farms API ---

export interface CreateFarmRequest {
  name: string;
  crop_type: CropType;
  province: string;
  area_rai?: number;
  polygon?: {
    type: "Polygon";
    coordinates: [number, number][][];
  };
  line_user_id: string;
}

export interface UpdateFarmBoundaryRequest {
  polygon: {
    type: "Polygon";
    coordinates: [number, number][][];
  };
}

export interface FarmWithLatestSnapshot extends Farm {
  latest_snapshot?: SatelliteSnapshot;
  pending_observations_count: number;
}

// --- Observations API ---

export interface CreateObservationRequest {
  farm_id: string;
  location: { lat: number; lng: number };
  observation_type: string;
  severity?: string;
  description?: string;
  labels?: string[];
  image_keys?: string[]; // S3 keys after upload
  voice_note_key?: string;
  created_at: string; // Client timestamp (for offline data)
}

export interface BatchSyncRequest {
  observations: CreateObservationRequest[];
  harvest_logs: CreateHarvestLogRequest[];
  device_id: string;
  last_sync_at: string | null;
}

export interface BatchSyncResponse {
  synced_observations: number;
  synced_harvest_logs: number;
  server_updates: {
    observations: FieldObservation[];
    satellite_snapshots: SatelliteSnapshot[];
    anomaly_alerts: unknown[];
  };
  sync_token: string;
}

// --- Harvests API ---

export interface CreateHarvestLogRequest {
  farm_id: string;
  harvest_date: string;
  crop_type?: CropType;
  estimated_yield_kg?: number;
  actual_yield_kg?: number;
  quality_notes?: string;
  price_per_kg?: number;
  notes?: string;
}

// --- Upload API ---

export interface PresignedUploadResponse {
  upload_url: string;
  key: string;
  public_url: string;
  expires_in: number;
}

// --- Satellite API ---

export interface TriggerAnalysisRequest {
  farm_id: string;
  date_from?: string;
  date_to?: string;
  source?: string;
}

export interface AnomalyFeedbackRequest extends AnomalyFeedback {}

// --- LINE Webhook Types ---

export interface LineWebhookBody {
  destination: string;
  events: LineEvent[];
}

export type LineEventType =
  | "message"
  | "follow"
  | "unfollow"
  | "postback"
  | "beacon";

export interface LineEvent {
  type: LineEventType;
  timestamp: number;
  source: {
    type: "user" | "group" | "room";
    userId: string;
    groupId?: string;
    roomId?: string;
  };
  replyToken?: string;
  message?: LineMessage;
  postback?: LinePostback;
}

export interface LineMessage {
  type: "text" | "image" | "video" | "audio" | "file" | "location";
  id: string;
  text?: string;
}

export interface LinePostback {
  data: string;
  params?: Record<string, string>;
}

// --- Sync Queue (Client-side) ---

export interface SyncQueueItem {
  id: string;
  type: "observation" | "harvest_log" | "farm_update";
  payload: unknown;
  created_at: number;
  retry_count: number;
  last_error?: string;
}
