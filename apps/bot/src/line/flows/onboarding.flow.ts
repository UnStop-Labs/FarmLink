import { Injectable, Logger } from "@nestjs/common";
import type { LineMessage } from "@farmlink/shared-types";
import { LineService } from "../line.service";
import { SessionService } from "../session.service";
import { buildCropTypeFlex } from "../flex/crop-selector.flex";
import { buildBoundaryInviteFlex } from "../flex/boundary-invite.flex";
import { getServiceClient } from "@farmlink/database";

// ============================================================
// Onboarding Flow
//
// Step sequence:
//   welcome → farm_name → crop_type → province → complete
//
// After complete, farmer is invited to draw boundary in LIFF
// ============================================================

const THAI_PROVINCES = [
  "เชียงใหม่", "เชียงราย", "ลำปาง", "ลำพูน", "แพร่", "น่าน",
  "พะเยา", "แม่ฮ่องสอน", "นครสวรรค์", "พิษณุโลก", "สุโขทัย",
  "อุตรดิตถ์", "เพชรบูรณ์", "ตาก", "กำแพงเพชร", "พิจิตร",
  "ขอนแก่น", "อุดรธานี", "นครราชสีมา", "สุรินทร์", "บุรีรัมย์",
  "อุบลราชธานี", "ร้อยเอ็ด", "มหาสารคาม", "กาฬสินธุ์", "สกลนคร",
  "นครพนม", "มุกดาหาร", "ยโสธร", "อำนาจเจริญ", "หนองบัวลำภู",
  "เลย", "หนองคาย", "ชัยภูมิ", "กรุงเทพมหานคร",
  "ชลบุรี", "ระยอง", "จันทบุรี", "ตราด", "สระแก้ว", "ปราจีนบุรี",
  "นครนายก", "ฉะเชิงเทรา", "สมุทรปราการ",
  "สุพรรณบุรี", "กาญจนบุรี", "ราชบุรี", "เพชรบุรี", "ประจวบคีรีขันธ์",
  "ชุมพร", "สุราษฎร์ธานี", "นครศรีธรรมราช", "พัทลุง", "สงขลา",
  "ปัตตานี", "ยะลา", "นราธิวาส", "สตูล", "ตรัง",
];

@Injectable()
export class OnboardingFlow {
  private readonly logger = new Logger(OnboardingFlow.name);

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
    const text = message.text?.trim() ?? "";

    switch (sessionData.step) {
      case "welcome":
        await this.askFarmName(userId, replyToken);
        break;

      case "farm_name":
        if (!text) {
          await this.line.replyMessage(replyToken,
            this.line.textMessage("กรุณาพิมพ์ชื่อไร่ของคุณครับ 🌾")
          );
          return;
        }
        await this.session.update(userId, {
          step: "crop_type",
          data: { farm_name: text },
        });
        await this.askCropType(userId, replyToken, text);
        break;

      case "province":
        const matched = THAI_PROVINCES.find(
          (p) => p.includes(text) || text.includes(p)
        );
        if (!matched && text.length < 3) {
          await this.line.replyMessage(replyToken,
            this.line.textMessage("กรุณาพิมพ์ชื่อจังหวัดของคุณครับ เช่น เชียงใหม่")
          );
          return;
        }
        await this.session.update(userId, {
          step: "complete",
          data: { province: matched ?? text },
        });
        await this.completeOnboarding(userId, replyToken);
        break;

      default:
        this.logger.warn(`Unknown onboarding step: ${sessionData.step}`);
    }
  }

  async handlePostback(
    userId: string,
    replyToken: string,
    params: string[]
  ): Promise<void> {
    const [step, value] = params;

    switch (step) {
      case "crop":
        await this.session.update(userId, {
          step: "province",
          data: { crop_type: value },
        });
        await this.askProvince(userId, replyToken);
        break;
    }
  }

  private async askFarmName(userId: string, replyToken: string): Promise<void> {
    await this.session.update(userId, { step: "farm_name" });
    await this.line.replyMessage(replyToken,
      this.line.textMessage(
        "ขอบคุณที่เข้าร่วม FarmLink! 🌾\n\nเริ่มต้นกัน:\nไร่ของคุณชื่ออะไรครับ? (พิมพ์ชื่อได้เลย)"
      )
    );
  }

  private async askCropType(
    userId: string,
    replyToken: string,
    farmName: string
  ): Promise<void> {
    const flex = buildCropTypeFlex(farmName);
    await this.line.replyMessage(replyToken, [
      this.line.textMessage(`"${farmName}" ได้เลยครับ! 👍\n\nปลูกพืชอะไรในไร่นี้ครับ?`),
      flex,
    ]);
  }

  private async askProvince(userId: string, replyToken: string): Promise<void> {
    await this.line.replyMessage(replyToken,
      this.line.textMessage(
        "ไร่ของคุณอยู่จังหวัดอะไรครับ?\n\nพิมพ์ชื่อจังหวัดได้เลย เช่น เชียงใหม่, ขอนแก่น, นครราชสีมา"
      )
    );
  }

  private async completeOnboarding(
    userId: string,
    replyToken: string
  ): Promise<void> {
    const sessionData = await this.session.get(userId);
    if (!sessionData) return;

    const { farm_name, crop_type, province } = sessionData.data as Record<string, string>;

    // Create farm record in database
    try {
      const db = getServiceClient();

      // First find/create profile
      const { data: profile } = await db
        .from("profiles")
        .select("id")
        .eq("line_user_id", userId)
        .single();

      if (profile) {
        await db.from("farms").insert({
          owner_id: profile.id,
          line_user_id: userId,
          name: farm_name,
          crop_type,
          province,
        });
      }
    } catch (err) {
      this.logger.error(`Failed to create farm: ${err}`);
    }

    // Clear session (onboarding complete)
    await this.session.clear(userId);

    // Invite to draw boundary in LIFF
    const boundaryFlex = buildBoundaryInviteFlex(
      farm_name,
      this.line.getLiffUrl("/onboarding?step=boundary")
    );

    await this.line.replyMessage(replyToken, [
      this.line.textMessage(
        `🎉 ยอดเยี่ยมครับ! สร้างไร่ "${farm_name}" เรียบร้อยแล้ว\n\nขั้นตอนสุดท้าย: ช่วยวาดขอบเขตไร่ในแผนที่ด้วยนะครับ`
      ),
      boundaryFlex,
    ]);
  }
}
