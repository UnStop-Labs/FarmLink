import type { FlexMessage } from "../line.service";

export function buildFarmMapFlex(liffUrl: string): FlexMessage {
  return {
    type: "flex",
    altText: "เปิดแผนที่ไร่",
    contents: {
      type: "bubble",
      hero: {
        type: "box",
        layout: "vertical",
        contents: [
          {
            type: "text",
            text: "🗺️",
            size: "5xl",
            align: "center",
            gravity: "center",
          },
        ],
        height: "120px",
        backgroundColor: "#E8F5E9",
        justifyContent: "center",
      },
      body: {
        type: "box",
        layout: "vertical",
        contents: [
          { type: "text", text: "แผนที่ไร่ของคุณ", weight: "bold", size: "xl" },
          {
            type: "text",
            text: "ดูขอบเขตไร่, NDVI, และจุดสำรวจบนแผนที่แบบ real-time",
            size: "sm",
            color: "#666666",
            wrap: true,
            margin: "sm",
          },
        ],
        paddingAll: "16px",
      },
      footer: {
        type: "box",
        layout: "vertical",
        contents: [
          {
            type: "button",
            action: { type: "uri", label: "🗺️ เปิดแผนที่", uri: liffUrl },
            style: "primary",
            color: "#2D7A35",
          },
        ],
        paddingAll: "16px",
      },
    },
  };
}
