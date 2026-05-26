import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { getServiceClient } from "@farmlink/database";
import { CreateObservationDto } from "./dto/create-observation.dto";

// ============================================================
// Observations Service
// Handles field observation CRUD with PostGIS point storage
// Image URLs resolved from S3 keys
// ============================================================

@Injectable()
export class ObservationsService {
  private readonly logger = new Logger(ObservationsService.name);
  private readonly s3Bucket: string;
  private readonly awsRegion: string;
  private readonly endpointUrl: string;

  constructor(private readonly config: ConfigService) {
    this.s3Bucket = config.get("aws.s3Bucket") ?? "farmlink-media";
    this.awsRegion = config.get("aws.region") ?? "ap-southeast-1";
    this.endpointUrl = config.get("aws.endpointUrl") ?? "";
  }

  async findByFarm(farmId: string, limit = 50, offset = 0) {
    const db = getServiceClient();
    const { data, error, count } = await db
      .from("field_observations")
      .select("*", { count: "exact" })
      .eq("farm_id", farmId)
      .order("observed_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) throw error;
    return { data, total: count };
  }

  async create(dto: CreateObservationDto) {
    const db = getServiceClient();

    // Resolve S3 keys → public URLs
    const imageUrls = (dto.image_keys ?? []).map((key) =>
      this.keyToUrl(key)
    );
    const voiceNoteUrl = dto.voice_note_key
      ? this.keyToUrl(dto.voice_note_key)
      : null;

    const { data, error } = await db
      .from("field_observations")
      .insert({
        farm_id: dto.farm_id,
        location: `SRID=4326;POINT(${dto.location.lng} ${dto.location.lat})`,
        observation_type: dto.observation_type,
        severity: dto.severity,
        description: dto.description,
        labels: dto.labels ?? [],
        image_urls: imageUrls,
        voice_note_url: voiceNoteUrl,
        observed_at: dto.observed_at ?? new Date().toISOString(),
        synced_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  /** Batch create — used by sync endpoint for offline data */
  async createBatch(dtos: CreateObservationDto[]) {
    const db = getServiceClient();

    const rows = dtos.map((dto) => ({
      farm_id: dto.farm_id,
      location: `SRID=4326;POINT(${dto.location.lng} ${dto.location.lat})`,
      observation_type: dto.observation_type,
      severity: dto.severity,
      description: dto.description,
      labels: dto.labels ?? [],
      image_urls: (dto.image_keys ?? []).map((k) => this.keyToUrl(k)),
      voice_note_url: dto.voice_note_key
        ? this.keyToUrl(dto.voice_note_key)
        : null,
      observed_at: dto.observed_at ?? new Date().toISOString(),
      synced_at: new Date().toISOString(),
    }));

    const { data, error } = await db
      .from("field_observations")
      .insert(rows)
      .select();

    if (error) throw error;
    return data;
  }

  /** Get observations updated after a given timestamp (for delta sync) */
  async findUpdatedSince(farmId: string, since: string) {
    const db = getServiceClient();
    const { data, error } = await db
      .from("field_observations")
      .select("*")
      .eq("farm_id", farmId)
      .gte("synced_at", since)
      .order("synced_at", { ascending: false });

    if (error) throw error;
    return data;
  }

  private keyToUrl(key: string): string {
    // LocalStack: use endpoint URL
    if (this.endpointUrl) {
      return `${this.endpointUrl}/${this.s3Bucket}/${key}`;
    }
    return `https://${this.s3Bucket}.s3.${this.awsRegion}.amazonaws.com/${key}`;
  }
}
