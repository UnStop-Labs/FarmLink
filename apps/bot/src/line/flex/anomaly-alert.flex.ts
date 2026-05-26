import type { FlexMessage } from "../line.service";
import type { Anomaly } from "@farmlink/shared-types";

// ============================================================
// Anomaly Alert Flex — pushed to farmer when AI detects issue
// ============================================================

const SEVERITY_COLORS: Record<string, string> = {
  watch: "#F59E0B",
  warning: "#EF4444",
  critical: "#991B1B",
};

const ANOMALY_TYPE_LABELS: Record<string, string> = {
  water_stress: "ขาดน้ำ 💧",
  disease_cluster: "โรคระบาด 🍂",
  nutrient_deficiency: "ขาดธาตุอาหาร 🌿",
  flooding: "น้ำท่วม 🌊",
  drought: "แล้ง ☀️",
  crop_damage: "ความเสียหาย ⚠️",
  unusual_growth: "การเจริญผิดปกติ 🔍",
};

export function buildAnomalyAlertFlex(
  anomaly: Anomaly,
  farmName: string,
  ndviImageUrl: string | null,
  liffUrl: string
): FlexMessage {
  const color = SEVERITY_COLORS[anomaly.severity] ?? "#F59E0B";
  const typeLabel = ANOMALY_TYPE_LABELS[anomaly.anomaly_type] ?? anomaly.anomaly_type;
  const confidencePct = Math.round(anomaly.confidence * 100);

  return {
    type: "flex",
    altText: `⚠️ แจ้งเตือน: ${typeLabel} ในไร่ ${farmName}`,
    contents: {
      type: "bubble",
      size: "mega",
      header: {
        type: "box",
        layout: "vertical",
        contents: [
          {
            type: "text",
            text: `⚠️ ตรวจพบความผิดปกติ`,
            color: "#FFFFFF",
            weight: "bold",
            size: "md",
          },
          {
            type: "text",
            text: farmName,
            color: "#FFFFFF88",
            size: "sm",
          },
        ],
        backgroundColor: color,
        paddingAll: "16px",
      },
      body: {
        type: "box",
        layout: "vertical",
        contents: [
          // Type + severity badge
          {
            type: "box",
            layout: "horizontal",
            contents: [
              {
                type: "text",
                text: typeLabel,
                size: "xl",
                weight: "bold",
                flex: 4,
              },
              {
                type: "box",
                layout: "vertical",
                contents: [
                  {
                    type: "text",
                    text: anomaly.severity.toUpperCase(),
                    size: "xs",
                    color: "#FFFFFF",
                    align: "center",
                  },
                ],
                backgroundColor: color,
                paddingAll: "6px",
                cornerRadius: "4px",
                flex: 1,
                justifyContent: "center",
              },
            ],
          },
          // NDVI image if available
          ...(ndviImageUrl
            ? [
                {
                  type: "image" as const,
                  url: ndviImageUrl,
                  size: "full",
                  aspectMode: "cover" as const,
                  aspectRatio: "20:9",
                  margin: "md" as const,
                },
              ]
            : []),
          { type: "separator" as const, margin: "md" as const },
          // Details
          {
            type: "box",
            layout: "vertical",
            margin: "md",
            spacing: "sm",
            contents: [
              infoRow("📋 คำอธิบาย", anomaly.description),
              infoRow("💡 คำแนะนำ", anomaly.recommendation),
              infoRow("🎯 ความน่าเชื่อถือ", `${confidencePct}%`),
            ],
          },
          { type: "separator" as const, margin: "md" as const },
          // Confirmation prompt
          {
            type: "text",
            text: "คุณเห็นปัญหานี้ในไร่จริงไหมครับ?",
            size: "sm",
            color: "#444444",
            margin: "md",
            weight: "bold",
          },
        ],
        paddingAll: "16px",
      },
      footer: {
        type: "box",
        layout: "vertical",
        spacing: "sm",
        contents: [
          {
            type: "box",
            layout: "horizontal",
            spacing: "sm",
            contents: [
              {
                type: "button",
                action: {
                  type: "postback",
                  label: "✅ ใช่ เห็นด้วย",
                  data: `anomaly_confirm:${anomaly.id}`,
                },
                style: "primary",
                color: "#2D7A35",
                flex: 1,
                height: "sm",
              },
              {
                type: "button",
                action: {
                  type: "postback",
                  label: "❌ ไม่พบ",
                  data: `anomaly_deny:${anomaly.id}`,
                },
                style: "secondary",
                flex: 1,
                height: "sm",
              },
            ],
          },
          {
            type: "button",
            action: {
              type: "postback",
              label: "❓ ไม่แน่ใจ",
              data: `anomaly_unsure:${anomaly.id}`,
            },
            style: "secondary",
            height: "sm",
          },
          {
            type: "button",
            action: { type: "uri", label: "🗺️ ดูในแผนที่", uri: liffUrl },
            style: "link",
            height: "sm",
          },
        ],
        paddingAll: "16px",
      },
    },
  };
}

function infoRow(label: string, text: string) {
  return {
    type: "box" as const,
    layout: "vertical" as const,
    contents: [
      { type: "text" as const, text: label, size: "xs" as const, color: "#888888" },
      { type: "text" as const, text, size: "sm" as const, color: "#333333", wrap: true },
    ],
  };
}
