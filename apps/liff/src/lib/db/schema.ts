import Dexie, { type Table } from "dexie";

// ============================================================
// FarmLink Offline Database — Dexie.js (IndexedDB wrapper)
//
// This is the local-first storage layer.
// Data here is the source of truth when offline.
// The sync engine moves data to Supabase when online.
// ============================================================

// Local observation (may not be synced yet)
export interface LocalObservation {
  id?: number;            // IndexedDB auto-increment key
  local_id: string;       // UUID generated client-side
  server_id?: string;     // Set after sync
  farm_id: string;
  lat: number;
  lng: number;
  observation_type: string;
  severity?: string;
  description?: string;
  labels: string[];
  image_data_urls: string[]; // Base64 blobs for offline storage
  image_s3_keys: string[];   // Set after S3 upload
  voice_note_data_url?: string;
  voice_note_s3_key?: string;
  observed_at: number;    // Unix timestamp
  synced: boolean;
  sync_error?: string;
  retry_count: number;
}

// Local harvest log
export interface LocalHarvestLog {
  id?: number;
  local_id: string;
  server_id?: string;
  farm_id: string;
  harvest_date: string;
  crop_type?: string;
  estimated_yield_kg?: number;
  actual_yield_kg?: number;
  quality_notes?: string;
  price_per_kg?: number;
  notes?: string;
  created_at: number;
  synced: boolean;
  sync_error?: string;
  retry_count: number;
}

// Cached farm data (from API)
export interface CachedFarm {
  id: string;
  owner_id: string;
  name: string;
  crop_type: string;
  province?: string;
  polygon?: unknown;
  area_rai?: number;
  line_user_id: string;
  cached_at: number;
}

// Cached satellite snapshot (for offline viewing)
export interface CachedSnapshot {
  id: string;
  farm_id: string;
  ndvi_mean: number;
  ndvi_trend: string;
  ndvi_overlay_url?: string;
  captured_at: string;
  anomalies: unknown[];
  cached_at: number;
}

// App settings / user state
export interface AppSettings {
  key: string;
  value: unknown;
}

export class FarmLinkDB extends Dexie {
  observations!: Table<LocalObservation>;
  harvest_logs!: Table<LocalHarvestLog>;
  farms!: Table<CachedFarm>;
  snapshots!: Table<CachedSnapshot>;
  settings!: Table<AppSettings>;

  constructor() {
    super("FarmLinkDB");

    this.version(1).stores({
      // & = primary key, ++ = auto-increment, * = multi-entry index
      observations:
        "++id, local_id, farm_id, synced, observed_at, observation_type",
      harvest_logs:
        "++id, local_id, farm_id, synced, harvest_date",
      farms: "id, owner_id, line_user_id, crop_type",
      snapshots: "id, farm_id, captured_at",
      settings: "key",
    });
  }
}

// Singleton instance
let _db: FarmLinkDB | null = null;

export function getDB(): FarmLinkDB {
  if (!_db) {
    _db = new FarmLinkDB();
  }
  return _db;
}
