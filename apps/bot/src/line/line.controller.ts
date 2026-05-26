import {
  Controller,
  Post,
  Headers,
  Body,
  RawBodyRequest,
  Req,
  HttpCode,
  HttpStatus,
  Logger,
  BadRequestException,
} from "@nestjs/common";
import { Request } from "express";
import type { LineWebhookBody, LineEvent } from "@farmlink/shared-types";
import { LineService } from "./line.service";
import { MessageHandler } from "./handlers/message.handler";
import { FollowHandler } from "./handlers/follow.handler";
import { PostbackHandler } from "./handlers/postback.handler";

// ============================================================
// LINE Webhook Controller
//
// LINE sends all events (messages, follows, postbacks) to this
// single POST endpoint. The controller:
//   1. Verifies the LINE signature
//   2. Routes each event to the appropriate handler
//   3. Returns 200 quickly (LINE retries if no 200 within 30s)
// ============================================================

@Controller()
export class LineController {
  private readonly logger = new Logger(LineController.name);

  constructor(
    private readonly lineService: LineService,
    private readonly messageHandler: MessageHandler,
    private readonly followHandler: FollowHandler,
    private readonly postbackHandler: PostbackHandler
  ) {}

  @Post("webhook")
  @HttpCode(HttpStatus.OK)
  async handleWebhook(
    @Headers("x-line-signature") signature: string,
    @Body() body: LineWebhookBody,
    @Req() req: RawBodyRequest<Request>
  ): Promise<{ status: string }> {
    // Verify LINE signature (skipped in mock mode)
    const rawBody = req.rawBody ?? Buffer.from(JSON.stringify(body));
    if (!this.lineService.verifySignature(rawBody, signature ?? "")) {
      this.logger.warn("Invalid LINE signature received");
      throw new BadRequestException("Invalid LINE signature");
    }

    // Process events in parallel but don't await — return 200 immediately
    this.processEvents(body.events).catch((err) =>
      this.logger.error(`Error processing events: ${err}`)
    );

    return { status: "ok" };
  }

  private async processEvents(events: LineEvent[]): Promise<void> {
    await Promise.allSettled(
      events.map((event) => this.routeEvent(event))
    );
  }

  private async routeEvent(event: LineEvent): Promise<void> {
    this.logger.debug(`Event: ${event.type} from ${event.source.userId}`);

    try {
      switch (event.type) {
        case "follow":
          await this.followHandler.handle(event);
          break;

        case "message":
          await this.messageHandler.handle(event);
          break;

        case "postback":
          await this.postbackHandler.handle(event);
          break;

        case "unfollow":
          this.logger.log(`User ${event.source.userId} unfollowed`);
          break;

        default:
          this.logger.debug(`Unhandled event type: ${event.type}`);
      }
    } catch (err) {
      this.logger.error(
        `Error handling ${event.type} from ${event.source.userId}: ${err}`
      );
    }
  }
}
