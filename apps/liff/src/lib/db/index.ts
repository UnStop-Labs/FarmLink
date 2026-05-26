export * from "./schema";

import { getDB } from "./schema";
import type { LocalObservation, LocalHarvestLog, CachedFarm } from "./schema";
import { v4 as uuidv4 } from "uuid";

// ============================================================
// DB helper functions — used by components and sync engine
// ============================================================

/** Save an observation locally (offline-safe) */
export async function saveObservationLocally(
  data: Omit<LocalObservation, "id" | "local_id" | "synced" | "retry_count" | "image_s3_keys">
): Promise<string> {
  const db = getDB();
  const local_id = uuidv4();

  await db.observations.add({
    ...data,
    local_id,
    synced: false,
    retry_count: 0,
    image_s3_keys: [],
  });

  // Request background sync if available
  if ("serviceWorker" in navigator && "SyncManager" in window) {
    const registration = await navigator.serviceWorker.ready;
    await (registration as unknown as { sync: { register: (tag: string) => Promise<void> } }).sync.register("farmlink-sync");
  }

  return local_id;
}

/** Save a harvest log locally */
export async function saveHarvestLocally(
  data: Omit<LocalHarvestLog, "id" | "local_id" | "synced" | "retry_count">
): Promise<string> {
  const db = getDB();
  const local_id = uuidv4();

  await db.harvest_logs.add({
    ...data,
    local_id,
    synced: false,
    retry_count: 0,
  });

  return local_id;
}

/** Get all unsynced items */
export async function getUnsyncedObservations(): Promise<LocalObservation[]> {
  return getDB().observations.where("synced").equals(0).toArray();
}

export async function getUnsyncedHarvestLogs(): Promise<LocalHarvestLog[]> {
  return getDB().harvest_logs.where("synced").equals(0).toArray();
}

/** Count pending items (for UI badge) */
export async function getPendingSyncCount(): Promise<number> {
  const db = getDB();
  const [obs, harvests] = await Promise.all([
    db.observations.where("synced").equals(0).count(),
    db.harvest_logs.where("synced").equals(0).count(),
  ]);
  return obs + harvests;
}

/** Mark items as synced */
export async function markObservationSynced(localId: string, serverId: string): Promise<void> {
  const db = getDB();
  await db.observations.where("local_id").equals(localId).modify({
    synced: true,
    server_id: serverId,
  });
}

export async function markHarvestSynced(localId: string, serverId: string): Promise<void> {
  const db = getDB();
  await db.harvest_logs.where("local_id").equals(localId).modify({
    synced: true,
    server_id: serverId,
  });
}

/** Cache farm data for offline access */
export async function cacheFarms(farms: CachedFarm[]): Promise<void> {
  const db = getDB();
  await db.farms.bulkPut(
    farms.map((f) => ({ ...f, cached_at: Date.now() }))
  );
}

/** Get cached farms */
export async function getCachedFarms(): Promise<CachedFarm[]> {
  return getDB().farms.toArray();
}

/** Store/get app settings */
export async function getSetting<T>(key: string, defaultValue: T): Promise<T> {
  const db = getDB();
  const row = await db.settings.get(key);
  return (row?.value as T) ?? defaultValue;
}

export async function setSetting(key: string, value: unknown): Promise<void> {
  await getDB().settings.put({ key, value });
}
