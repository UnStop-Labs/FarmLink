import { Injectable, Logger } from "@nestjs/common";
import type { LineMessage } from "@farmlink/shared-types";
import { LineService } from "../line.service";
import { SessionService } from "../session.service";

// ============================================================
// Survey Flow — handles AI anomaly confirmation surveys
// Triggered when satellite detects potential issues
// ============================================================

@Injectable()
export class SurveyFlow {
  private readonly logger = new Logger(SurveyFlow.name);

  constructor(
    private readonly line: LineService,
    private readonly session: SessionService
  ) {}

  async handleMessage(
    userId: string,
    replyToken: string,
    message: LineMessage,
    sessionData: { flow: string; step: string; data: Record<string, unknown> }
  ): Promise<void> {
    switch (sessionData.step) {
      case "awaiting_anomaly_photo":
        if (message.type === "image") {
          await this.handleAnomalyPhoto(userId, replyToken, message.id, sessionData.data);
        } else {
          await this.line.replyMessage(
            replyToken,
            this.line.withQuickReplies(
              this.line.textMessage("กรุณาส่งรูปภาพครับ หรือข้ามขั้นตอนนี้ได้"),
              [{ label: "⏭️ ข้ามไปก่อน", data: "survey:skip_photo" }]
            )
          );
        }
        break;

      case "awaiting_disease_description":
        await this.handleDiseaseDescription(userId, replyToken, message.text ?? "", sessionData.data);
        break;

      default:
        this.logger.warn(`Unknown survey step: ${sessionData.step}`);
    }
  }

  async handlePostback(
    userId: string,
    replyToken: string,
    params: string[]
  ): Promise<void> {
    const [step, value] = params;

    switch (step) {
      case "skip_photo":
        await this.session.clear(userId);
        await this.line.replyMessage(replyToken,
          this.line.textMessage("เข้าใจครับ 👍 ขอบคุณที่แจ้ง!")
        );
        break;

      case "disease_type":
        await this.session.update(userId, {
          step: "awaiting_disease_description",
          data: { disease_type: value },
        });
        await this.line.replyMessage(replyToken,
          this.line.textMessage("อธิบายอาการที่เห็นได้เลยครับ (หรือพิมพ์ 'ข้าม')")
        );
        break;
    }
  }

  private async handleAnomalyPhoto(
    userId: string,
    replyToken: string,
    imageMessageId: string,
    data: Record<string, unknown>
  ): Promise<void> {
    // TODO: Download image from LINE CDN and store in S3
    // TODO: Link to anomaly_alerts record

    await this.session.update(userId, { step: "awaiting_disease_type" });

    await this.line.replyMessage(replyToken, [
      this.line.textMessage("📸 ได้รับรูปแล้ว ขอบคุณครับ!"),
      this.line.withQuickReplies(
        this.line.textMessage("โรคหรือปัญหาที่เห็นคืออะไรครับ?"),
        [
          { label: "🍂 โรคใบ", data: "survey:disease_type:leaf_disease" },
          { label: "🌱 รากเน่า", data: "survey:disease_type:root_rot" },
          { label: "🐛 แมลง", data: "survey:disease_type:pest" },
          { label: "❓ ไม่แน่ใจ", data: "survey:disease_type:unknown" },
        ]
      ),
    ]);
  }

  private async handleDiseaseDescription(
    userId: string,
    replyToken: string,
    description: string,
    data: Record<string, unknown>
  ): Promise<void> {
    // TODO: Save field observation with AI training labels to DB
    await this.session.clear(userId);

    await this.line.replyMessage(replyToken,
      this.line.textMessage(
        "✅ บันทึกข้อมูลเรียบร้อยครับ!\n\nข้อมูลของคุณจะช่วยปรับปรุงการวิเคราะห์ไร่ในอนาคต 🌾"
      )
    );
  }
}
