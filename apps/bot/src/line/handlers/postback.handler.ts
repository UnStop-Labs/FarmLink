import { Injectable, Logger } from "@nestjs/common";
import type { LineEvent } from "@farmlink/shared-types";
import { LineService } from "../line.service";
import { SessionService } from "../session.service";
import { OnboardingFlow } from "../flows/onboarding.flow";
import { SurveyFlow } from "../flows/survey.flow";
import { PhotoFlow } from "../flows/photo.flow";
import { buildFarmMapFlex } from "../flex/farm-map.flex";

// ============================================================
// Postback Handler — processes button taps from Flex Messages
// and Quick Reply buttons that use postback actions
// ============================================================

@Injectable()
export class PostbackHandler {
  private readonly logger = new Logger(PostbackHandler.name);

  constructor(
    private readonly line: LineService,
    private readonly session: SessionService,
    private readonly onboardingFlow: OnboardingFlow,
    private readonly surveyFlow: SurveyFlow,
    private readonly photoFlow: PhotoFlow
  ) {}

  async handle(event: LineEvent): Promise<void> {
    const userId = event.source.userId;
    const replyToken = event.replyToken!;
    const data = event.postback?.data ?? "";

    this.logger.debug(`Postback from ${userId}: ${data}`);

    // Parse postback data (format: "action:param1:param2")
    const [action, ...params] = data.split(":");

    switch (action) {
      case "menu":
        await this.handleMenu(userId, replyToken, params[0]);
        break;

      case "onboarding":
        await this.onboardingFlow.handlePostback(userId, replyToken, params);
        break;

      case "survey":
        await this.surveyFlow.handlePostback(userId, replyToken, params);
        break;

      case "photo_type":
        await this.photoFlow.handlePhotoType(
          userId,
          replyToken,
          params[0],
          params[1]
        );
        break;

      case "anomaly_confirm":
        await this.handleAnomalyFeedback(userId, replyToken, params[0], true);
        break;

      case "anomaly_deny":
        await this.handleAnomalyFeedback(userId, replyToken, params[0], false);
        break;

      case "anomaly_unsure":
        await this.handleAnomalyUnsure(userId, replyToken, params[0]);
        break;

      default:
        this.logger.warn(`Unknown postback action: ${action}`);
        await this.line.replyMessage(
          replyToken,
          this.line.textMessage("ขออภัยครับ ไม่เข้าใจคำสั่งนี้")
        );
    }
  }

  private async handleMenu(
    userId: string,
    replyToken: string,
    menuItem: string
  ): Promise<void> {
    switch (menuItem) {
      case "map":
        await this.line.replyMessage(replyToken,
          buildFarmMapFlex(this.line.getLiffUrl("/map"))
        );
        break;

      case "report":
        await this.line.replyMessage(replyToken, [
          this.line.textMessage("📸 ถ่ายรูปหรืออัปโหลดจากคลังภาพได้เลยครับ"),
          this.line.withQuickReplies(
            this.line.textMessage("หรือเปิดแอปเพื่อบันทึกพิกัด GPS ด้วย:"),
            [{ label: "📍 เปิดแอปสำรวจ", data: "menu:scout" }]
          ),
        ]);
        break;

      case "health":
        // TODO: fetch real farm health data
        await this.line.replyMessage(replyToken,
          this.line.textMessage(
            "🌿 กำลังดึงข้อมูลสุขภาพไร่...\nจะส่งรายงานให้ในไม่ช้าครับ"
          )
        );
        break;

      case "harvest":
        await this.line.replyMessage(replyToken,
          this.line.textMessage(
            `📋 บันทึกการเก็บเกี่ยว:\n${this.line.getLiffUrl("/harvest")}`
          )
        );
        break;

      case "scout":
        await this.line.replyMessage(replyToken,
          this.line.textMessage(
            `🔍 โหมดสำรวจไร่:\n${this.line.getLiffUrl("/scouting")}`
          )
        );
        break;
    }
  }

  private async handleAnomalyFeedback(
    userId: string,
    replyToken: string,
    anomalyId: string,
    confirmed: boolean
  ): Promise<void> {
    // TODO: Update anomaly_alerts table with farmer confirmation
    if (confirmed) {
      await this.line.replyMessage(replyToken, [
        this.line.textMessage(
          "ขอบคุณครับ! ✅ ข้อมูลของคุณช่วยให้ AI เรียนรู้ได้ดีขึ้น\n\nช่วยถ่ายรูปบริเวณที่พบปัญหาได้ไหมครับ?"
        ),
      ]);
      // Set session to await photo
      await this.session.set(userId, {
        flow: "survey",
        step: "awaiting_anomaly_photo",
        data: { anomaly_id: anomalyId },
      });
    } else {
      await this.line.replyMessage(replyToken,
        this.line.textMessage(
          "ขอบคุณครับ! ✅ จะปรับปรุงการวิเคราะห์ให้แม่นยำขึ้นในครั้งหน้า"
        )
      );
    }
  }

  private async handleAnomalyUnsure(
    userId: string,
    replyToken: string,
    anomalyId: string
  ): Promise<void> {
    await this.line.replyMessage(replyToken, [
      this.line.textMessage(
        "ไม่เป็นไรครับ 👍 ถ้าสังเกตเห็นความผิดปกติในไร่ แจ้งได้เลยนะครับ"
      ),
    ]);
  }
}
