import type { FlexMessage } from "../line.service";

const CROPS = [
  { id: "rice", label: "ข้าว", emoji: "🌾" },
  { id: "sugarcane", label: "อ้อย", emoji: "🎋" },
  { id: "cassava", label: "มันสำปะหลัง", emoji: "🌿" },
  { id: "corn", label: "ข้าวโพด", emoji: "🌽" },
  { id: "rubber", label: "ยางพารา", emoji: "🌳" },
  { id: "durian", label: "ทุเรียน", emoji: "🌟" },
  { id: "mango", label: "มะม่วง", emoji: "🥭" },
  { id: "longan", label: "ลำไย", emoji: "🍇" },
  { id: "pineapple", label: "สับปะรด", emoji: "🍍" },
  { id: "vegetable", label: "ผัก", emoji: "🥬" },
  { id: "other", label: "อื่นๆ", emoji: "🌱" },
];

export function buildCropTypeFlex(farmName: string): FlexMessage {
  // Build 2-column grid of crop buttons
  const rows = chunkArray(CROPS, 2).map((pair) => ({
    type: "box" as const,
    layout: "horizontal" as const,
    spacing: "sm" as const,
    contents: pair.map((crop) => ({
      type: "button" as const,
      action: {
        type: "postback" as const,
        label: `${crop.emoji} ${crop.label}`,
        data: `onboarding:crop:${crop.id}`,
        displayText: crop.label,
      },
      style: "secondary" as const,
      height: "sm" as const,
      flex: 1,
    })),
  }));

  return {
    type: "flex",
    altText: "เลือกประเภทพืช",
    contents: {
      type: "bubble",
      body: {
        type: "box",
        layout: "vertical",
        spacing: "sm",
        contents: [
          {
            type: "text",
            text: "🌱 เลือกพืชที่ปลูก",
            weight: "bold",
            size: "lg",
          },
          {
            type: "text",
            text: `สำหรับไร่ "${farmName}"`,
            size: "sm",
            color: "#888888",
            margin: "xs",
          },
          { type: "separator" as const, margin: "md" as const },
          ...rows,
        ],
        paddingAll: "16px",
      },
    },
  };
}

function chunkArray<T>(arr: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < arr.length; i += size) {
    chunks.push(arr.slice(i, i + size));
  }
  return chunks;
}
