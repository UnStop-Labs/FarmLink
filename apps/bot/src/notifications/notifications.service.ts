import { Injectable, Logger } from "@nestjs/common";
import { Cron, CronExpression } from "@nestjs/schedule";
import { LineService } from "../line/line.service";
import { buildAnomalyAlertFlex } from "../line/flex/anomaly-alert.flex";
import { buildNdviReportFlex } from "../line/flex/ndvi-report.flex";
import { getServiceClient } from "@farmlink/database";
import type { Anomaly } from "@farmlink/shared-types";

// ============================================================
// Notifications Service
// Scheduled jobs that push alerts and reports to farmers
// ============================================================

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(private readonly line: LineService) {}

  /**
   * Every 6 hours: check for unnotified anomaly alerts and push to farmers
   */
  @Cron("0 */6 * * *")
  async sendPendingAnomalyAlerts(): Promise<void> {
    this.logger.log("Checking for pending anomaly alerts...");

    try {
      const db = getServiceClient();

      // Fetch anomalies that haven't been sent yet
      const { data: alerts } = await db
        .from("anomaly_alerts")
        .select(`
          *,
          farms!inner(name, line_user_id)
        `)
        .is("notified_at", null)
        .gte("confidence", 0.6) // Only notify high-confidence detections
        .order("created_at", { ascending: true })
        .limit(50);

      if (!alerts || alerts.length === 0) return;

      this.logger.log(`Sending ${alerts.length} anomaly alerts`);

      for (const alert of alerts) {
        try {
          const farm = alert.farms as { name: string; line_user_id: string };
          const anomaly = alert as unknown as Anomaly;

          const flex = buildAnomalyAlertFlex(
            anomaly,
            farm.name,
            alert.ndvi_overlay_url ?? null,
            this.line.getLiffUrl(`/map?anomaly=${alert.id}`)
          );

          await this.line.pushMessage(farm.line_user_id, flex);

          // Mark as notified
          await db
            .from("anomaly_alerts")
            .update({ notified_at: new Date().toISOString() })
            .eq("id", alert.id);

        } catch (err) {
          this.logger.error(`Failed to send alert ${alert.id}: ${err}`);
        }
      }
    } catch (err) {
      this.logger.error(`Failed to process anomaly alerts: ${err}`);
    }
  }

  /**
   * Every Monday 7:00 AM Thailand time: send weekly NDVI report
   */
  @Cron("0 0 * * 1", { timeZone: "Asia/Bangkok" })
  async sendWeeklyReports(): Promise<void> {
    this.logger.log("Sending weekly NDVI reports...");

    try {
      const db = getServiceClient();

      // Get all active farms with recent satellite snapshots
      const { data: farms } = await db
        .from("farms")
        .select(`
          id,
          name,
          crop_type,
          line_user_id,
          satellite_snapshots(
            ndvi_mean,
            ndvi_trend,
            ndvi_overlay_url,
            captured_at
          )
        `)
        .eq("is_active", true)
        .order("captured_at", { referencedTable: "satellite_snapshots", ascending: false })
        .limit(1, { referencedTable: "satellite_snapshots" });

      if (!farms) return;

      for (const farm of farms) {
        const snapshots = farm.satellite_snapshots as unknown as Array<{
          ndvi_mean: number;
          ndvi_trend: string;
          ndvi_overlay_url: string | null;
          captured_at: string;
        }>;
        const snapshot = snapshots?.[0];
        if (!snapshot) continue;

        try {
          const flex = buildNdviReportFlex({
            farmName: farm.name,
            cropType: farm.crop_type,
            ndviMean: snapshot.ndvi_mean,
            ndviTrend: snapshot.ndvi_trend,
            capturedAt: snapshot.captured_at,
            ndviImageUrl: snapshot.ndvi_overlay_url,
            liffUrl: this.line.getLiffUrl("/map"),
          });

          await this.line.pushMessage(farm.line_user_id, flex);
        } catch (err) {
          this.logger.error(`Failed to send report to ${farm.line_user_id}: ${err}`);
        }
      }
    } catch (err) {
      this.logger.error(`Failed to send weekly reports: ${err}`);
    }
  }

  /**
   * Daily 8:00 AM: send survey to farmers with recent anomalies
   */
  @Cron("0 1 * * *", { timeZone: "Asia/Bangkok" }) // 8 AM Bangkok = 1 AM UTC
  async sendDailySurveys(): Promise<void> {
    this.logger.log("Sending daily surveys...");

    try {
      const db = getServiceClient();

      // Find farms with unconfirmed anomalies older than 2 days
      const { data: farms } = await db
        .from("farms")
        .select(`
          line_user_id,
          name,
          anomaly_alerts!inner(id)
        `)
        .eq("is_active", true)
        .is("anomaly_alerts.farmer_confirmed", null)
        .lte("anomaly_alerts.created_at", new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString())
        .limit(100);

      if (!farms) return;

      for (const farm of farms) {
        await this.line.pushMessage(
          farm.line_user_id,
          this.line.withQuickReplies(
            this.line.textMessage(
              `🌾 สวัสดีครับ! ไร่ ${farm.name} เป็นยังไงบ้างวันนี้ครับ?`
            ),
            [
              { label: "✅ ปกติดีครับ", data: "survey:daily:ok" },
              { label: "⚠️ พบปัญหา", data: "survey:daily:issue" },
              { label: "💧 รดน้ำแล้ว", data: "survey:daily:irrigated" },
            ]
          )
        );
      }
    } catch (err) {
      this.logger.error(`Failed to send daily surveys: ${err}`);
    }
  }

  /** Manual trigger — send anomaly alert immediately */
  async sendAnomalyAlert(
    lineUserId: string,
    anomaly: Anomaly,
    farmName: string,
    ndviImageUrl: string | null
  ): Promise<void> {
    const flex = buildAnomalyAlertFlex(
      anomaly,
      farmName,
      ndviImageUrl,
      this.line.getLiffUrl(`/map?anomaly=${anomaly.id}`)
    );
    await this.line.pushMessage(lineUserId, flex);
  }
}
