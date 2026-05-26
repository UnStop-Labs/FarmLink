import { Injectable, Logger } from "@nestjs/common";
import { getServiceClient } from "@farmlink/database";
import { ObservationsService } from "../observations/observations.service";
import { HarvestsService } from "../harvests/harvests.service";
import type { BatchSyncRequest, BatchSyncResponse } from "@farmlink/shared-types";
import { v4 as uuidv4 } from "uuid";

// ============================================================
// Sync Service — processes batches of offline data
//
// The LIFF app queues data locally (IndexedDB) while offline.
// When connectivity returns, it POSTs everything here in one
// batch. The response includes any server-side updates the
// client missed (new snapshots, anomalies, etc.).
// ============================================================

@Injectable()
export class SyncService {
  private readonly logger = new Logger(SyncService.name);

  constructor(
    private readonly observationsService: ObservationsService,
    private readonly harvestsService: HarvestsService
  ) {}

  async processBatch(
    userId: string,
    payload: BatchSyncRequest
  ): Promise<BatchSyncResponse> {
    const syncStart = Date.now();
    this.logger.log(
      `Sync batch from ${userId}: ${payload.observations.length} observations, ` +
        `${payload.harvest_logs.length} harvest logs`
    );

    // --- 1. Save offline observations ---
    let syncedObservations = 0;
    if (payload.observations.length > 0) {
      try {
        await this.observationsService.createBatch(payload.observations);
        syncedObservations = payload.observations.length;
      } catch (err) {
        this.logger.error(`Failed to sync observations: ${err}`);
      }
    }

    // --- 2. Save offline harvest logs ---
    let syncedHarvestLogs = 0;
    if (payload.harvest_logs.length > 0) {
      try {
        await this.harvestsService.createBatch(payload.harvest_logs);
        syncedHarvestLogs = payload.harvest_logs.length;
      } catch (err) {
        this.logger.error(`Failed to sync harvest logs: ${err}`);
      }
    }

    // --- 3. Fetch server-side updates the client missed ---
    const serverUpdates = await this.fetchServerUpdates(
      userId,
      payload.last_sync_at
    );

    // --- 4. Generate a new sync token (timestamp-based) ---
    const syncToken = new Date().toISOString();

    this.logger.log(
      `Sync complete in ${Date.now() - syncStart}ms. ` +
        `Synced: ${syncedObservations} obs, ${syncedHarvestLogs} harvests. ` +
        `Server updates: ${JSON.stringify({
          obs: serverUpdates.observations.length,
          snapshots: serverUpdates.satellite_snapshots.length,
          anomalies: serverUpdates.anomaly_alerts.length,
        })}`
    );

    return {
      synced_observations: syncedObservations,
      synced_harvest_logs: syncedHarvestLogs,
      server_updates: serverUpdates,
      sync_token: syncToken,
    };
  }

  private async fetchServerUpdates(
    userId: string,
    lastSyncAt: string | null
  ): Promise<BatchSyncResponse["server_updates"]> {
    const db = getServiceClient();
    const since = lastSyncAt ?? new Date(0).toISOString();

    try {
      // Get the user's farm IDs
      const { data: farms } = await db
        .from("farms")
        .select("id")
        .eq("line_user_id", userId)
        .eq("is_active", true);

      if (!farms || farms.length === 0) {
        return { observations: [], satellite_snapshots: [], anomaly_alerts: [] };
      }

      const farmIds = farms.map((f) => f.id);

      // Fetch new observations (from other devices / admin entries)
      const { data: observations } = await db
        .from("field_observations")
        .select("*")
        .in("farm_id", farmIds)
        .gte("synced_at", since)
        .order("synced_at", { ascending: false })
        .limit(100);

      // Fetch new satellite snapshots
      const { data: snapshots } = await db
        .from("satellite_snapshots")
        .select("*")
        .in("farm_id", farmIds)
        .gte("created_at", since)
        .order("created_at", { ascending: false })
        .limit(20);

      // Fetch new anomaly alerts
      const { data: anomalies } = await db
        .from("anomaly_alerts")
        .select("*")
        .in("farm_id", farmIds)
        .gte("created_at", since)
        .order("created_at", { ascending: false })
        .limit(50);

      return {
        observations: observations ?? [],
        satellite_snapshots: snapshots ?? [],
        anomaly_alerts: anomalies ?? [],
      };
    } catch (err) {
      this.logger.error(`Failed to fetch server updates: ${err}`);
      return { observations: [], satellite_snapshots: [], anomaly_alerts: [] };
    }
  }
}
