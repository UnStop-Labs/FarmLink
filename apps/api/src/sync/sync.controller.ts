import { Controller, Post, Body, UseGuards, Req } from "@nestjs/common";
import { ApiTags, ApiBearerAuth, ApiOperation } from "@nestjs/swagger";
import { Request } from "express";
import { AuthGuard } from "../auth/auth.guard";
import { SyncService } from "./sync.service";
import type { BatchSyncRequest } from "@farmlink/shared-types";

// ============================================================
// Sync Controller
//
// Single endpoint: POST /api/sync
// Accepts all offline data (observations + harvests) in one
// request and returns server-side updates in the response.
// This is the bridge between offline IndexedDB and Supabase.
// ============================================================

@ApiTags("Sync")
@ApiBearerAuth()
@UseGuards(AuthGuard)
@Controller("api/sync")
export class SyncController {
  constructor(private readonly syncService: SyncService) {}

  @Post()
  @ApiOperation({
    summary: "Batch sync offline data and receive server updates",
    description:
      "Upload all queued offline observations and harvest logs in one request. " +
      "Returns any server-side changes (new satellite snapshots, anomalies) " +
      "that the client missed while offline.",
  })
  async sync(@Body() body: BatchSyncRequest, @Req() req: Request) {
    // Use LINE user ID from request body if available (bot traffic),
    // otherwise fall back to the authenticated user ID
    const userId =
      (body as unknown as { line_user_id?: string }).line_user_id ??
      req.user!.id;

    return this.syncService.processBatch(userId, body);
  }
}
