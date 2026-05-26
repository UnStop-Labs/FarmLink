import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { getServiceClient } from "@farmlink/database";
import axios from "axios";

// ============================================================
// Satellite Service
//
// Communicates with the Python AI Engine to trigger analysis.
// Stores results in satellite_snapshots + anomaly_alerts tables.
// ============================================================

@Injectable()
export class SatelliteService {
  private readonly logger = new Logger(SatelliteService.name);
  private readonly aiEngineUrl: string;

  constructor(private readonly config: ConfigService) {
    this.aiEngineUrl = config.get("aiEngine.url") ?? "http://localhost:8000";
  }

  /** Get snapshot history for a farm */
  async getSnapshots(farmId: string, limit = 10) {
    const db = getServiceClient();
    const { data, error } = await db
      .from("satellite_snapshots")
      .select(`
        *,
        anomaly_alerts(*)
      `)
      .eq("farm_id", farmId)
      .order("captured_at", { ascending: false })
      .limit(limit);

    if (error) throw error;
    return data;
  }

  /** Get NDVI time series for trend charts */
  async getNdviTimeSeries(farmId: string, days = 90) {
    const db = getServiceClient();
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();

    const { data, error } = await db
      .from("satellite_snapshots")
      .select("captured_at, ndvi_mean, ndvi_min, ndvi_max, cloud_cover_percent")
      .eq("farm_id", farmId)
      .gte("captured_at", since)
      .order("captured_at", { ascending: true });

    if (error) throw error;
    return { farm_id: farmId, data_points: data };
  }

  /** Get unresolved anomalies for a farm */
  async getAnomalies(farmId: string) {
    const db = getServiceClient();
    const { data, error } = await db
      .from("anomaly_alerts")
      .select("*")
      .eq("farm_id", farmId)
      .is("farmer_confirmed", null)
      .order("created_at", { ascending: false });

    if (error) throw error;
    return data;
  }

  /** Trigger satellite analysis for a farm via AI Engine */
  async triggerAnalysis(farmId: string, dateFrom?: string, dateTo?: string) {
    try {
      const db = getServiceClient();

      // Get farm geometry
      const { data: farm, error } = await db
        .from("farms")
        .select("id, name, polygon, crop_type")
        .eq("id", farmId)
        .single();

      if (error || !farm) throw new Error(`Farm ${farmId} not found`);

      // Call AI Engine
      const response = await axios.post(
        `${this.aiEngineUrl}/api/ndvi/analyze`,
        {
          farm_id: farmId,
          geometry: farm.polygon,
          crop_type: farm.crop_type,
          date_from: dateFrom,
          date_to: dateTo,
        },
        { timeout: 30_000 }
      );

      const result = response.data;

      // Store snapshot
      const { data: snapshot } = await db
        .from("satellite_snapshots")
        .insert({
          farm_id: farmId,
          source: result.source ?? "sentinel-2",
          captured_at: result.captured_at,
          cloud_cover_percent: result.cloud_cover_percent ?? 0,
          ndvi_mean: result.ndvi_mean,
          ndvi_min: result.ndvi_min,
          ndvi_max: result.ndvi_max,
          ndvi_trend: result.ndvi_trend ?? "unknown",
          water_stress_index: result.water_stress_index,
          chlorophyll_index: result.chlorophyll_index,
          true_color_url: result.true_color_url,
          ndvi_overlay_url: result.ndvi_overlay_url,
        })
        .select()
        .single();

      // Store detected anomalies
      if (result.anomalies?.length > 0 && snapshot) {
        await db.from("anomaly_alerts").insert(
          result.anomalies.map((a: Record<string, unknown>) => ({
            snapshot_id: snapshot.id,
            farm_id: farmId,
            anomaly_type: a.anomaly_type,
            severity: a.severity,
            confidence: a.confidence,
            affected_area_sqm: a.affected_area_sqm,
            description: a.description,
            recommendation: a.recommendation,
          }))
        );
      }

      return snapshot;
    } catch (err) {
      this.logger.error(`Failed to trigger analysis for farm ${farmId}: ${err}`);
      throw err;
    }
  }

  /** Update anomaly with farmer feedback */
  async submitAnomalyFeedback(
    anomalyId: string,
    confirmed: boolean,
    feedback?: string
  ) {
    const db = getServiceClient();
    const { data, error } = await db
      .from("anomaly_alerts")
      .update({
        farmer_confirmed: confirmed,
        farmer_feedback: feedback,
      })
      .eq("id", anomalyId)
      .select()
      .single();

    if (error) throw error;
    return data;
  }
}
