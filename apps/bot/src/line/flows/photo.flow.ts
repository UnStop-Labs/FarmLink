import { Injectable, Logger } from "@nestjs/common";
import { LineService } from "../line.service";
import { SessionService } from "../session.service";

@Injectable()
export class PhotoFlow {
  private readonly logger = new Logger(PhotoFlow.name);

  constructor(
    private readonly line: LineService,
    private readonly session: SessionService
  ) {}

  async handlePhotoType(
    userId: string,
    replyToken: string,
    photoType: string,
    messageId: string
  ): Promise<void> {
    // TODO: Download from LINE CDN, store in S3, create observation record
    this.logger.log(`Photo type: ${photoType}, messageId: ${messageId}`);

    const typeLabels: Record<string, string> = {
      disease: "โรคพืช 🍂",
      pest: "แมลง/ศัตรูพืช 🐛",
      irrigation: "ปัญหาน้ำ 💧",
      general: "บันทึกทั่วไป 📋",
    };

    await this.line.replyMessage(replyToken, [
      this.line.textMessage(
        `✅ บันทึกรูป${typeLabels[photoType] ?? photoType}แล้วครับ!\n\nต้องการเพิ่มรายละเอียดไหมครับ?`
      ),
      this.line.withQuickReplies(
        this.line.textMessage("เพิ่มข้อมูล:"),
        [
          { label: "📍 เพิ่มพิกัด GPS", data: "photo:add_location" },
          { label: "✏️ เพิ่มคำอธิบาย", data: "photo:add_description" },
          { label: "✅ เสร็จแล้ว", data: "photo:done" },
        ]
      ),
    ]);
  }
}
