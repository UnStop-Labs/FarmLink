import { Injectable, Logger } from "@nestjs/common";
import type { LineEvent } from "@farmlink/shared-types";
import { LineService } from "../line.service";
import { buildWelcomeFlex } from "../flex/welcome.flex";
import { SessionService } from "../session.service";

// ============================================================
// Follow Handler — triggers when a user adds the LINE bot
// Starts the onboarding flow with a welcome Flex Message
// ============================================================

@Injectable()
export class FollowHandler {
  private readonly logger = new Logger(FollowHandler.name);

  constructor(
    private readonly line: LineService,
    private readonly session: SessionService
  ) {}

  async handle(event: LineEvent): Promise<void> {
    const userId = event.source.userId;
    const replyToken = event.replyToken!;

    this.logger.log(`New follower: ${userId}`);

    // Get user's LINE profile
    const profile = await this.line.getUserProfile(userId);

    // Initialize onboarding session
    await this.session.set(userId, {
      flow: "onboarding",
      step: "welcome",
      data: {
        line_user_id: userId,
        display_name: profile.displayName,
      },
    });

    // Send welcome message with Flex Card
    const welcomeMessage = buildWelcomeFlex(
      profile.displayName,
      this.line.getLiffUrl("/onboarding")
    );

    await this.line.replyMessage(replyToken, [
      this.line.textMessage(
        `สวัสดีครับ ${profile.displayName}! 🌾\nยินดีต้อนรับสู่ FarmLink ผู้ช่วยดูแลไร่ของคุณทาง LINE`
      ),
      welcomeMessage,
    ]);
  }
}
