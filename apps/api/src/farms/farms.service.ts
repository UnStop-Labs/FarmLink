import { Injectable, NotFoundException, Logger } from "@nestjs/common";
import { getServiceClient } from "@farmlink/database";
import { CreateFarmDto } from "./dto/create-farm.dto";
import { UpdateFarmDto } from "./dto/update-farm.dto";

// ============================================================
// Farms Service — all farm CRUD with PostGIS geometry handling
// ============================================================

@Injectable()
export class FarmsService {
  private readonly logger = new Logger(FarmsService.name);

  /** Get all farms for a user */
  async findAll(ownerId: string) {
    const db = getServiceClient();
    const { data, error } = await db
      .from("farms")
      .select("*")
      .eq("owner_id", ownerId)
      .eq("is_active", true)
      .order("created_at", { ascending: false });

    if (error) throw error;
    return data;
  }

  /** Get a single farm, verifying ownership */
  async findOne(id: string, ownerId: string) {
    const db = getServiceClient();
    const { data, error } = await db
      .from("farms")
      .select(`
        *,
        satellite_snapshots(
          id, ndvi_mean, ndvi_trend, captured_at, ndvi_overlay_url
        ),
        field_observations(count),
        anomaly_alerts(count)
      `)
      .eq("id", id)
      .eq("owner_id", ownerId)
      .order("captured_at", { referencedTable: "satellite_snapshots", ascending: false })
      .limit(1, { referencedTable: "satellite_snapshots" })
      .single();

    if (error || !data) throw new NotFoundException(`Farm ${id} not found`);
    return data;
  }

  /** Get farm by LINE user ID (used by bot) */
  async findByLineUserId(lineUserId: string) {
    const db = getServiceClient();
    const { data, error } = await db
      .from("farms")
      .select("*")
      .eq("line_user_id", lineUserId)
      .eq("is_active", true)
      .order("created_at", { ascending: false });

    if (error) throw error;
    return data ?? [];
  }

  /** Create a new farm */
  async create(ownerId: string, dto: CreateFarmDto) {
    const db = getServiceClient();

    const insertData: Record<string, unknown> = {
      owner_id: ownerId,
      name: dto.name,
      crop_type: dto.crop_type,
      province: dto.province,
      area_rai: dto.area_rai,
      line_user_id: dto.line_user_id ?? "",
    };

    // Convert GeoJSON polygon to PostGIS format
    if (dto.polygon) {
      insertData.polygon = `SRID=4326;${this.geojsonToWKT(dto.polygon)}`;
    }

    const { data, error } = await db
      .from("farms")
      .insert(insertData)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  /** Update farm fields or boundary */
  async update(id: string, ownerId: string, dto: UpdateFarmDto) {
    const db = getServiceClient();

    const updateData: Record<string, unknown> = {};
    if (dto.name) updateData.name = dto.name;
    if (dto.crop_type) updateData.crop_type = dto.crop_type;
    if (dto.province) updateData.province = dto.province;
    if (dto.area_rai !== undefined) updateData.area_rai = dto.area_rai;

    if (dto.polygon) {
      updateData.polygon = `SRID=4326;${this.geojsonToWKT(dto.polygon)}`;
    }

    const { data, error } = await db
      .from("farms")
      .update(updateData)
      .eq("id", id)
      .eq("owner_id", ownerId)
      .select()
      .single();

    if (error || !data) throw new NotFoundException(`Farm ${id} not found`);
    return data;
  }

  /** Soft-delete a farm */
  async remove(id: string, ownerId: string) {
    const db = getServiceClient();
    const { error } = await db
      .from("farms")
      .update({ is_active: false })
      .eq("id", id)
      .eq("owner_id", ownerId);

    if (error) throw error;
    return { success: true };
  }

  /** Get farms within a map bounding box (for viewport queries) */
  async findInBbox(minLng: number, minLat: number, maxLng: number, maxLat: number) {
    const db = getServiceClient();
    const { data, error } = await db.rpc("get_farms_in_bbox", {
      min_lng: minLng,
      min_lat: minLat,
      max_lng: maxLng,
      max_lat: maxLat,
    });

    if (error) throw error;
    return data;
  }

  /** Get farm health summary (for LINE bot reports) */
  async getHealthSummary(farmId: string) {
    const db = getServiceClient();
    const { data, error } = await db.rpc("get_farm_health_summary", {
      p_farm_id: farmId,
    });

    if (error) throw error;
    return data?.[0] ?? null;
  }

  // Convert GeoJSON Polygon to Well-Known Text (PostGIS format)
  private geojsonToWKT(polygon: { type: string; coordinates: [number, number][][] }): string {
    const ring = polygon.coordinates[0]
      .map(([lng, lat]) => `${lng} ${lat}`)
      .join(",");
    return `POLYGON((${ring}))`;
  }
}
