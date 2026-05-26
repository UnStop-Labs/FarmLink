import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { v4 as uuidv4 } from "uuid";

// ============================================================
// Upload Service — S3 presigned URL generation + direct upload
//
// Flow:
//   1. Client requests presigned URL from POST /api/upload/presign
//   2. Client uploads directly to S3 (no proxy through API)
//   3. Client sends the S3 key to observation/harvest endpoints
//
// Works with both LocalStack (local dev) and real AWS S3.
// ============================================================

@Injectable()
export class UploadService {
  private readonly logger = new Logger(UploadService.name);
  private readonly s3: S3Client;
  private readonly bucket: string;
  private readonly endpointUrl: string;

  constructor(private readonly config: ConfigService) {
    this.bucket = config.get("aws.s3Bucket") ?? "farmlink-media";
    this.endpointUrl = config.get("aws.endpointUrl") ?? "";

    this.s3 = new S3Client({
      region: config.get("aws.region") ?? "ap-southeast-1",
      credentials: {
        accessKeyId: config.get("aws.accessKeyId") ?? "localstack",
        secretAccessKey: config.get("aws.secretAccessKey") ?? "localstack",
      },
      // LocalStack endpoint override
      ...(this.endpointUrl
        ? {
            endpoint: this.endpointUrl,
            forcePathStyle: true, // Required for LocalStack
          }
        : {}),
    });
  }

  /**
   * Generate a presigned URL for direct browser-to-S3 upload.
   * Expires in 15 minutes.
   */
  async generatePresignedUploadUrl(
    fileType: string,
    folder: "photos" | "voice" | "satellite" = "photos"
  ): Promise<{ upload_url: string; key: string; public_url: string }> {
    const ext = this.mimeToExt(fileType);
    const key = `${folder}/${uuidv4()}${ext}`;

    const command = new PutObjectCommand({
      Bucket: this.bucket,
      Key: key,
      ContentType: fileType,
    });

    const uploadUrl = await getSignedUrl(this.s3, command, {
      expiresIn: 900, // 15 minutes
    });

    const publicUrl = this.keyToPublicUrl(key);

    return { upload_url: uploadUrl, key, public_url: publicUrl };
  }

  /** Get a presigned download URL (for private files) */
  async generatePresignedDownloadUrl(key: string): Promise<string> {
    const command = new GetObjectCommand({
      Bucket: this.bucket,
      Key: key,
    });

    return getSignedUrl(this.s3, command, { expiresIn: 3600 });
  }

  private keyToPublicUrl(key: string): string {
    if (this.endpointUrl) {
      return `${this.endpointUrl}/${this.bucket}/${key}`;
    }
    const region = this.config.get("aws.region") ?? "ap-southeast-1";
    return `https://${this.bucket}.s3.${region}.amazonaws.com/${key}`;
  }

  private mimeToExt(mimeType: string): string {
    const map: Record<string, string> = {
      "image/jpeg": ".jpg",
      "image/png": ".png",
      "image/webp": ".webp",
      "image/heic": ".heic",
      "audio/mp4": ".m4a",
      "audio/mpeg": ".mp3",
      "audio/webm": ".webm",
      "audio/ogg": ".ogg",
    };
    return map[mimeType] ?? ".bin";
  }
}
