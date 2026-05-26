// ============================================================
// Sync Engine — uploads offline data to the server
//
// Runs when:
//   - App comes online (window online event)
//   - Background sync fires (service worker)
//   - User manually triggers
//   - App starts and detects pending items
// ============================================================

import axios from "axios";
import {
  getUnsyncedObservations,
  getUnsyncedHarvestLogs,
  markObservationSynced,
  markHarvestSynced,
  setSetting,
  getSetting,
} from "../db";
import type { LocalObservation, LocalHarvestLog } from "../db/schema";
import type { BatchSyncRequest, BatchSyncResponse } from "@farmlink/shared-types";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";
const MAX_RETRIES = 3;

export type SyncStatus = "idle" | "syncing" | "error" | "success";

// Callbacks for UI updates
export interface SyncCallbacks {
  onStart?: () => void;
  onProgress?: (message: string) => void;
  onSuccess?: (response: BatchSyncResponse) => void;
  onError?: (error: Error) => void;
}

/** Main sync function — call this whenever online */
export async function runSync(
  lineUserId: string,
  authToken: string | null,
  callbacks?: SyncCallbacks
): Promise<void> {
  const pendingObs = await getUnsyncedObservations();
  const pendingHarvests = await getUnsyncedHarvestLogs();

  if (pendingObs.length === 0 && pendingHarvests.length === 0) {
    // Nothing to sync — still fetch server updates
    await fetchServerUpdates(lineUserId, authToken, callbacks);
    return;
  }

  callbacks?.onStart?.();
  callbacks?.onProgress?.(
    `กำลังอัปโหลด ${pendingObs.length} การสำรวจ, ${pendingHarvests.length} บันทึกเก็บเกี่ยว...`
  );

  try {
    // Filter items that haven't exceeded max retries
    const eligibleObs = pendingObs.filter((o) => o.retry_count < MAX_RETRIES);
    const eligibleHarvests = pendingHarvests.filter(
      (h) => h.retry_count < MAX_RETRIES
    );

    const lastSyncAt = await getSetting<string | null>("last_sync_at", null);

    const payload: BatchSyncRequest & { line_user_id: string } = {
      line_user_id: lineUserId,
      observations: eligibleObs.map(mapObsToDto),
      harvest_logs: eligibleHarvests.map(mapHarvestToDto),
      device_id: await getDeviceId(),
      last_sync_at: lastSyncAt,
    };

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };
    if (authToken) {
      headers["Authorization"] = `Bearer ${authToken}`;
    }

    const response = await axios.post<BatchSyncResponse>(
      `${API_URL}/api/sync`,
      payload,
      { headers, timeout: 30_000 }
    );

    const result = response.data;

    // Mark synced items
    // Note: batch sync returns counts, not individual IDs
    // For simplicity, mark all eligible items as synced
    for (const obs of eligibleObs) {
      await markObservationSynced(obs.local_id, obs.local_id); // server_id = local_id until API returns IDs
    }
    for (const harvest of eligibleHarvests) {
      await markHarvestSynced(harvest.local_id, harvest.local_id);
    }

    // Store sync timestamp
    await setSetting("last_sync_at", result.sync_token);

    callbacks?.onSuccess?.(result);
    callbacks?.onProgress?.(`✅ ซิงค์สำเร็จ`);
  } catch (err) {
    const error = err instanceof Error ? err : new Error(String(err));
    console.error("[SyncEngine] Sync failed:", error);
    callbacks?.onError?.(error);

    // Increment retry counts
    for (const obs of pendingObs) {
      // TODO: increment retry_count in IndexedDB
    }
  }
}

/** Fetch server updates without uploading (when nothing pending) */
async function fetchServerUpdates(
  lineUserId: string,
  authToken: string | null,
  callbacks?: SyncCallbacks
): Promise<void> {
  const lastSyncAt = await getSetting<string | null>("last_sync_at", null);

  try {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };
    if (authToken) headers["Authorization"] = `Bearer ${authToken}`;

    const response = await axios.post<BatchSyncResponse>(
      `${API_URL}/api/sync`,
      {
        line_user_id: lineUserId,
        observations: [],
        harvest_logs: [],
        device_id: await getDeviceId(),
        last_sync_at: lastSyncAt,
      },
      { headers, timeout: 15_000 }
    );

    await setSetting("last_sync_at", response.data.sync_token);
    callbacks?.onSuccess?.(response.data);
  } catch {
    // Network error — will retry next time
  }
}

/** Convert local observation to API DTO */
function mapObsToDto(obs: LocalObservation) {
  return {
    farm_id: obs.farm_id,
    location: { lat: obs.lat, lng: obs.lng },
    observation_type: obs.observation_type,
    severity: obs.severity,
    description: obs.description,
    labels: obs.labels,
    image_keys: obs.image_s3_keys,
    voice_note_key: obs.voice_note_s3_key,
    observed_at: new Date(obs.observed_at).toISOString(),
  };
}

function mapHarvestToDto(h: LocalHarvestLog) {
  return {
    farm_id: h.farm_id,
    harvest_date: h.harvest_date,
    crop_type: h.crop_type,
    estimated_yield_kg: h.estimated_yield_kg,
    actual_yield_kg: h.actual_yield_kg,
    quality_notes: h.quality_notes,
    price_per_kg: h.price_per_kg,
    notes: h.notes,
  };
}

/** Stable device ID stored in IndexedDB */
async function getDeviceId(): Promise<string> {
  const { getSetting, setSetting } = await import("../db");
  let deviceId = await getSetting<string | null>("device_id", null);
  if (!deviceId) {
    const { v4 } = await import("uuid");
    deviceId = v4();
    await setSetting("device_id", deviceId);
  }
  return deviceId;
}

/** Register for background sync (called after saving offline data) */
export async function requestBackgroundSync(): Promise<void> {
  if ("serviceWorker" in navigator && "SyncManager" in window) {
    try {
      const reg = await navigator.serviceWorker.ready;
      await (reg as unknown as { sync: { register: (t: string) => Promise<void> } })
        .sync.register("farmlink-sync");
    } catch {
      // Background sync not supported — no-op
    }
  }
}
