import type { FlexMessage } from "../line.service";

// ============================================================
// Welcome Flex Message — shown when user first follows the bot
// ============================================================

export function buildWelcomeFlex(
  displayName: string,
  liffUrl: string
): FlexMessage {
  return {
    type: "flex",
    altText: "ยินดีต้อนรับสู่ FarmLink! 🌾",
    contents: {
      type: "bubble",
      size: "mega",
      header: {
        type: "box",
        layout: "vertical",
        contents: [
          {
            type: "text",
            text: "🌾 FarmLink",
            color: "#FFFFFF",
            size: "xl",
            weight: "bold",
          },
          {
            type: "text",
            text: "ผู้ช่วยดูแลไร่อัจฉริยะ",
            color: "#FFFFFF88",
            size: "sm",
          },
        ],
        backgroundColor: "#2D7A35",
        paddingAll: "20px",
      },
      body: {
        type: "box",
        layout: "vertical",
        contents: [
          {
            type: "text",
            text: `สวัสดีครับ คุณ${displayName}`,
            size: "lg",
            weight: "bold",
            color: "#1a1a1a",
          },
          {
            type: "text",
            text: "FarmLink ช่วยดูแลไร่ของคุณผ่าน LINE ด้วย:",
            size: "sm",
            color: "#666666",
            margin: "md",
            wrap: true,
          },
          {
            type: "box",
            layout: "vertical",
            margin: "lg",
            spacing: "sm",
            contents: [
              featureRow("🛰️", "วิเคราะห์ไร่จากดาวเทียม"),
              featureRow("📍", "สำรวจไร่แบบออฟไลน์"),
              featureRow("🤖", "AI แจ้งเตือนปัญหาพืช"),
              featureRow("📊", "ติดตามการเก็บเกี่ยว"),
            ],
          },
        ],
        paddingAll: "20px",
      },
      footer: {
        type: "box",
        layout: "vertical",
        contents: [
          {
            type: "button",
            action: {
              type: "uri",
              label: "🗺️ เริ่มลงทะเบียนไร่",
              uri: liffUrl,
            },
            style: "primary",
            color: "#2D7A35",
            height: "sm",
          },
          {
            type: "button",
            action: {
              type: "postback",
              label: "💬 พิมพ์ชื่อไร่",
              data: "onboarding:start",
              displayText: "เริ่มลงทะเบียนผ่านแชท",
            },
            style: "secondary",
            height: "sm",
            margin: "sm",
          },
        ],
        paddingAll: "20px",
        spacing: "none",
      },
    },
  };
}

function featureRow(icon: string, text: string) {
  return {
    type: "box" as const,
    layout: "horizontal" as const,
    contents: [
      { type: "text" as const, text: icon, size: "sm" as const, flex: 0 },
      {
        type: "text" as const,
        text,
        size: "sm" as const,
        color: "#444444",
        margin: "md" as const,
      },
    ],
  };
}
