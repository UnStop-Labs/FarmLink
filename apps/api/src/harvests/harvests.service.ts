import { Injectable } from "@nestjs/common";
import { getServiceClient } from "@farmlink/database";
import { CreateHarvestDto } from "./dto/create-harvest.dto";

@Injectable()
export class HarvestsService {
  async findByFarm(farmId: string) {
    const db = getServiceClient();
    const { data, error } = await db
      .from("harvest_logs")
      .select("*")
      .eq("farm_id", farmId)
      .order("harvest_date", { ascending: false });

    if (error) throw error;
    return data;
  }

  async create(dto: CreateHarvestDto) {
    const db = getServiceClient();

    // Auto-calculate revenue if both price and yield are provided
    const totalRevenue =
      dto.actual_yield_kg && dto.price_per_kg
        ? dto.actual_yield_kg * dto.price_per_kg
        : dto.estimated_yield_kg && dto.price_per_kg
        ? dto.estimated_yield_kg * dto.price_per_kg
        : null;

    const { data, error } = await db
      .from("harvest_logs")
      .insert({
        farm_id: dto.farm_id,
        harvest_date: dto.harvest_date,
        crop_type: dto.crop_type,
        estimated_yield_kg: dto.estimated_yield_kg,
        actual_yield_kg: dto.actual_yield_kg,
        quality_notes: dto.quality_notes,
        price_per_kg: dto.price_per_kg,
        total_revenue: totalRevenue,
        notes: dto.notes,
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async createBatch(dtos: CreateHarvestDto[]) {
    const db = getServiceClient();
    const rows = dtos.map((dto) => ({
      farm_id: dto.farm_id,
      harvest_date: dto.harvest_date,
      crop_type: dto.crop_type,
      estimated_yield_kg: dto.estimated_yield_kg,
      actual_yield_kg: dto.actual_yield_kg,
      quality_notes: dto.quality_notes,
      price_per_kg: dto.price_per_kg,
      notes: dto.notes,
    }));

    const { data, error } = await db
      .from("harvest_logs")
      .insert(rows)
      .select();

    if (error) throw error;
    return data;
  }

  /** Yield analytics for a farm over time */
  async getYieldStats(farmId: string) {
    const db = getServiceClient();
    const { data, error } = await db
      .from("harvest_logs")
      .select("harvest_date, crop_type, actual_yield_kg, estimated_yield_kg, total_revenue, price_per_kg")
      .eq("farm_id", farmId)
      .order("harvest_date", { ascending: false });

    if (error) throw error;

    const harvests = data ?? [];
    const totalYield = harvests.reduce((sum, h) => sum + (h.actual_yield_kg ?? 0), 0);
    const totalRevenue = harvests.reduce((sum, h) => sum + (h.total_revenue ?? 0), 0);

    return {
      harvests,
      summary: {
        total_harvests: harvests.length,
        total_yield_kg: totalYield,
        total_revenue_thb: totalRevenue,
        avg_yield_kg: harvests.length > 0 ? totalYield / harvests.length : 0,
      },
    };
  }
}
