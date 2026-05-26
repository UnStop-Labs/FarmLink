import type { FlexMessage } from "../line.service";

export function buildBoundaryInviteFlex(
  farmName: string,
  liffUrl: string
): FlexMessage {
  return {
    type: "flex",
    altText: "วาดขอบเขตไร่",
    contents: {
      type: "bubble",
      header: {
        type: "box",
        layout: "vertical",
        contents: [
          { type: "text", text: "วาดขอบเขตไร่", color: "#FFFFFF", weight: "bold", size: "lg" },
          { type: "text", text: farmName, color: "#FFFFFF88", size: "sm" },
        ],
        backgroundColor: "#1565C0",
        paddingAll: "16px",
      },
      body: {
        type: "box",
        layout: "vertical",
        contents: [
          {
            type: "text",
            text: "วิธีการวาดขอบเขต:",
            weight: "bold",
            size: "md",
          },
          stepRow("1️⃣", "เปิดแผนที่แล้วซูมเข้าไร่ของคุณ"),
          stepRow("2️⃣", "แตะที่มุมไร่ตามเข็มนาฬิกา"),
          stepRow("3️⃣", "หรือเดินรอบไร่แล้วกด GPS"),
          stepRow("4️⃣", "กด 'บันทึก' เมื่อเสร็จ"),
        ],
        spacing: "sm",
        paddingAll: "16px",
      },
      footer: {
        type: "box",
        layout: "vertical",
        contents: [
          {
            type: "button",
            action: { type: "uri", label: "📍 วาดขอบเขตไร่", uri: liffUrl },
            style: "primary",
            color: "#1565C0",
          },
        ],
        paddingAll: "16px",
      },
    },
  };
}

function stepRow(num: string, text: string) {
  return {
    type: "box" as const,
    layout: "horizontal" as const,
    margin: "sm" as const,
    contents: [
      { type: "text" as const, text: num, size: "sm" as const, flex: 0 },
      { type: "text" as const, text, size: "sm" as const, color: "#444444", margin: "md" as const, wrap: true, flex: 5 },
    ],
  };
}
