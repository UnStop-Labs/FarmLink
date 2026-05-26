import { Controller, Post, Body, UseGuards } from "@nestjs/common";
import { ApiTags, ApiBearerAuth, ApiOperation, ApiBody } from "@nestjs/swagger";
import { IsString, IsIn } from "class-validator";
import { AuthGuard } from "../auth/auth.guard";
import { UploadService } from "./upload.service";

class PresignRequest {
  @IsString()
  file_type: string; // MIME type, e.g. "image/jpeg"

  @IsString()
  @IsIn(["photos", "voice", "satellite"])
  folder: "photos" | "voice" | "satellite";
}

@ApiTags("Upload")
@ApiBearerAuth()
@UseGuards(AuthGuard)
@Controller("api/upload")
export class UploadController {
  constructor(private readonly uploadService: UploadService) {}

  @Post("presign")
  @ApiOperation({
    summary: "Get a presigned S3 URL for direct browser upload",
    description:
      "Returns a temporary upload URL valid for 15 minutes. " +
      "The client uploads directly to S3 using this URL, then sends " +
      "the returned 'key' to the observations or harvests endpoints.",
  })
  @ApiBody({ type: PresignRequest })
  async presign(@Body() body: PresignRequest) {
    return this.uploadService.generatePresignedUploadUrl(
      body.file_type,
      body.folder ?? "photos"
    );
  }
}
