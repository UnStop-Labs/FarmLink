import { Controller, Get, Post, Body, Param, Query, UseGuards } from "@nestjs/common";
import { ApiTags, ApiBearerAuth, ApiOperation } from "@nestjs/swagger";
import { AuthGuard } from "../auth/auth.guard";
import { SatelliteService } from "./satellite.service";

@ApiTags("Satellite")
@ApiBearerAuth()
@UseGuards(AuthGuard)
@Controller("api/satellite")
export class SatelliteController {
  constructor(private readonly satelliteService: SatelliteService) {}

  @Get("farm/:farmId/snapshots")
  @ApiOperation({ summary: "Get satellite snapshot history for a farm" })
  async getSnapshots(
    @Param("farmId") farmId: string,
    @Query("limit") limit = "10"
  ) {
    return this.satelliteService.getSnapshots(farmId, parseInt(limit));
  }

  @Get("farm/:farmId/ndvi-series")
  @ApiOperation({ summary: "Get NDVI time series (for trend charts)" })
  async getNdviSeries(
    @Param("farmId") farmId: string,
    @Query("days") days = "90"
  ) {
    return this.satelliteService.getNdviTimeSeries(farmId, parseInt(days));
  }

  @Get("farm/:farmId/anomalies")
  @ApiOperation({ summary: "Get unresolved anomaly alerts for a farm" })
  async getAnomalies(@Param("farmId") farmId: string) {
    return this.satelliteService.getAnomalies(farmId);
  }

  @Post("farm/:farmId/analyze")
  @ApiOperation({ summary: "Trigger satellite analysis (calls AI engine)" })
  async triggerAnalysis(
    @Param("farmId") farmId: string,
    @Body() body: { date_from?: string; date_to?: string }
  ) {
    return this.satelliteService.triggerAnalysis(
      farmId,
      body.date_from,
      body.date_to
    );
  }

  @Post("anomalies/:anomalyId/feedback")
  @ApiOperation({ summary: "Submit farmer feedback on an anomaly detection" })
  async feedback(
    @Param("anomalyId") anomalyId: string,
    @Body() body: { confirmed: boolean; feedback?: string }
  ) {
    return this.satelliteService.submitAnomalyFeedback(
      anomalyId,
      body.confirmed,
      body.feedback
    );
  }
}
