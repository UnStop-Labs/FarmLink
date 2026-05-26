import { Injectable, Logger } from "@nestjs/common";
import type { LineEvent } from "@farmlink/shared-types";
import { LineService } from "../line.service";
import { SessionService } from "../session.service";
import { OnboardingFlow } from "../flows/onboarding.flow";
import { SurveyFlow } from "../flows/survey.flow";

// ============================================================
// Message Handler — processes incoming text and image messages
// Routes to the correct flow based on session state
// ============================================================

@Injectable()
export class MessageHandler {
  private readonly logger = new Logger(MessageHandler.name);

  constructor(
    private readonly line: LineService,
    private readonly session: SessionService,
    private readonly onboardingFlow: OnboardingFlow,
    private readonly surveyFlow: SurveyFlow
  ) {}

  async handle(event: LineEvent): Promise<void> {
    const userId = event.source.userId;
    const replyToken = event.replyToken!;
    const message = event.message!;

    // Get current session state
    const sessionData = await this.session.get(userId);

    // Route based on current flow
    if (sessionData?.flow === "onboarding") {
      await this.onboardingFlow.handleMessage(
        userId,
        replyToken,
        message,
        sessionData
      );
      return;
    }

    if (sessionData?.flow === "survey") {
      await this.surveyFlow.handleMessage(
        userId,
        replyToken,
        message,
        sessionData
      );
      return;
    }

    // Handle image messages (field photos)
    if (message.type === "image") {
      await this.handleImageMessage(userId, replyToken, message.id);
      return;
    }

    // Default: menu / help response
    await this.handleDefaultMessage(userId, replyToken, message.text ?? "");
  }

  private async handleImageMessage(
    userId: string,
    replyToken: string,
    messageId: string
  ): Promise<void> {
    await this.line.replyMessage(replyToken, [
      this.line.textMessage(
        "📸 ได้รับรูปภาพแล้วครับ!\n\nรูปนี้เป็นอะไรในไร่ครับ?"
      ),
      this.line.withQuickReplies(
        this.line.textMessage("เลือกประเภทที่ตรงกับรูปมากที่สุด:"),
        [
          { label: "🌿 โรคพืช", data: `photo_type:disease:${messageId}` },
          { label: "🐛 แมลง/ศัตรูพืช", data: `photo_type:pest:${messageId}` },
          { label: "💧 ปัญหาน้ำ", data: `photo_type:irrigation:${messageId}` },
          { label: "📋 ทั่วไป", data: `photo_type:general:${messageId}` },
        ]
      ),
    ]);
  }

  private async handleDefaultMessage(
    userId: string,
    replyToken: string,
    text: string
  ): Promise<void> {
    const lowerText = text.toLowerCase().trim();

    // Keyword shortcuts
    if (lowerText.includes("แผนที่") || lowerText.includes("map")) {
      await this.line.replyMessage(replyToken,
        this.line.textMessage(
          `🗺️ เปิดแผนที่ไร่ของคุณได้เลยครับ:\n${this.line.getLiffUrl("/map")}`
        )
      );
      return;
    }

    if (lowerText.includes("เก็บเกี่ยว") || lowerText.includes("harvest")) {
      await this.line.replyMessage(replyToken,
        this.line.textMessage(
          `📊 บันทึกการเก็บเกี่ยวได้ที่:\n${this.line.getLiffUrl("/harvest")}`
        )
      );
      return;
    }

    // Default menu
    await this.line.replyMessage(replyToken, [
      this.line.textMessage("สวัสดีครับ! 🌾 FarmLink พร้อมช่วยเหลือ"),
      this.line.withQuickReplies(
        this.line.textMessage("เลือกสิ่งที่ต้องการ:"),
        [
          { label: "🗺️ แผนที่ไร่", data: "menu:map" },
          { label: "📸 รายงานปัญหา", data: "menu:report" },
          { label: "📊 สุขภาพไร่", data: "menu:health" },
          { label: "📋 บันทึกเก็บเกี่ยว", data: "menu:harvest" },
        ]
      ),
    ]);
  }
}
