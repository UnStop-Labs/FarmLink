import type { FlexMessage } from "../line.service";

// ============================================================
// NDVI Weekly Report Flex — pushed on a schedule
// ============================================================

function ndviColor(ndvi: number): string {
  if (ndvi >= 0.6) return "#1B5E20"; // Deep green — very healthy
  if (ndvi >= 0.4) return "#2D7A35"; // Green — healthy
  if (ndvi >= 0.2) return "#F9A825"; // Amber — moderate
  return "#C62828";                  // Red — stressed/bare
}

function ndviLabel(ndvi: number): string {
  if (ndvi >= 0.6) return "สมบูรณ์มาก 🌿";
  if (ndvi >= 0.4) return "ปกติดี ✅";
  if (ndvi >= 0.2) return "ควรติดตาม ⚠️";
  return "มีปัญหา ❗";
}

function trendEmoji(trend: string): string {
  const map: Record<string, string> = {
    improving: "📈",
    stable: "➡️",
    declining: "📉",
    unknown: "❓",
  };
  return map[trend] ?? "❓";
}

export function buildNdviReportFlex(params: {
  farmName: string;
  cropType: string;
  ndviMean: number;
  ndviTrend: string;
  capturedAt: string;
  ndviImageUrl: string | null;
  liffUrl: string;
}): FlexMessage {
  const { farmName, cropType, ndviMean, ndviTrend, capturedAt, ndviImageUrl, liffUrl } = params;
  const color = ndviColor(ndviMean);
  const label = ndviLabel(ndviMean);
  const trendIcon = trendEmoji(ndviTrend);
  const ndviPct = Math.round(ndviMean * 100);
  const dateStr = new Date(capturedAt).toLocaleDateString("th-TH");

  return {
    type: "flex",
    altText: `รายงาน NDVI ไร่ ${farmName}`,
    contents: {
      type: "bubble",
      size: "mega",
      header: {
        type: "box",
        layout: "vertical",
        contents: [
          { type: "text", text: "🛰️ รายงานสุขภาพไร่", color: "#FFFFFF", weight: "bold", size: "md" },
          { type: "text", text: dateStr, color: "#FFFFFF88", size: "xs" },
        ],
        backgroundColor: color,
        paddingAll: "16px",
      },
      hero: ndviImageUrl
        ? {
            type: "image",
            url: ndviImageUrl,
            size: "full",
            aspectRatio: "20:9",
            aspectMode: "cover",
          }
        : undefined,
      body: {
        type: "box",
        layout: "vertical",
        contents: [
          { type: "text", text: farmName, weight: "bold", size: "xl" },
          { type: "text", text: cropType, size: "sm", color: "#888888" },
          { type: "separator", margin: "md" },
          {
            type: "box",
            layout: "horizontal",
            margin: "md",
            contents: [
              ndviStat("ค่า NDVI", `${ndviPct}%`, color),
              ndviStat("สถานะ", label, color),
              ndviStat("แนวโน้ม", `${trendIcon}`, "#444444"),
            ],
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
            action: { type: "uri", label: "🗺️ ดูแผนที่และรายละเอียด", uri: liffUrl },
            style: "primary",
            color,
          },
        ],
        paddingAll: "16px",
      },
    },
  };
}

function ndviStat(label: string, value: string, color: string) {
  return {
    type: "box" as const,
    layout: "vertical" as const,
    contents: [
      { type: "text" as const, text: label, size: "xs" as const, color: "#888888", align: "center" as const },
      { type: "text" as const, text: value, size: "md" as const, weight: "bold" as const, color, align: "center" as const },
    ],
    flex: 1,
  };
}
