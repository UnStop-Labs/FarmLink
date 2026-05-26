"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense } from "react";
import dynamic from "next/dynamic";
import { createFarm, updateFarmBoundary } from "../../lib/api/client";
import { useFarmStore } from "../../store/farm.store";

const FarmMap = dynamic(() => import("../../components/map/FarmMap"), { ssr: false });

// ============================================================
// Onboarding Page — web-based farm registration
// Used when farmer taps "Register Farm" from LINE bot
// ============================================================

const CROP_OPTIONS = [
  { id: "rice", label: "ข้าว", emoji: "🌾" },
  { id: "sugarcane", label: "อ้อย", emoji: "🎋" },
  { id: "cassava", label: "มันสำปะหลัง", emoji: "🌿" },
  { id: "corn", label: "ข้าวโพด", emoji: "🌽" },
  { id: "rubber", label: "ยางพารา", emoji: "🌳" },
  { id: "durian", label: "ทุเรียน", emoji: "🌟" },
  { id: "mango", label: "มะม่วง", emoji: "🥭" },
  { id: "vegetable", label: "ผัก/พืชอื่นๆ", emoji: "🥬" },
];

type Step = "info" | "boundary" | "done";

function OnboardingContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { profile, setFarms } = useFarmStore();

  const [step, setStep] = useState<Step>(
    searchParams.get("step") === "boundary" ? "boundary" : "info"
  );
  const [farmName, setFarmName] = useState("");
  const [cropType, setCropType] = useState("");
  const [province, setProvince] = useState("");
  const [createdFarmId, setCreatedFarmId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleCreateFarm = async () => {
    if (!farmName || !cropType) return;
    setSaving(true);
    setError(null);

    try {
      const farm = await createFarm({
        name: farmName,
        crop_type: cropType,
        province: province || undefined,
        line_user_id: profile?.userId,
      });
      setCreatedFarmId(farm.id);
      setStep("boundary");
    } catch {
      setError("เกิดข้อผิดพลาด กรุณาลองอีกครั้ง");
    } finally {
      setSaving(false);
    }
  };

  const handleBoundaryComplete = async (points: [number, number][]) => {
    if (!createdFarmId) return;
    setSaving(true);

    try {
      await updateFarmBoundary(createdFarmId, {
        type: "Polygon",
        coordinates: [[...points, points[0]]],
      });
      setStep("done");
    } catch {
      setError("บันทึกขอบเขตไม่สำเร็จ");
    } finally {
      setSaving(false);
    }
  };

  if (step === "info") {
    return (
      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <div className="bg-green-700 text-white px-4 pt-12 pb-8">
          <div className="text-4xl mb-3">🌾</div>
          <h1 className="text-2xl font-bold">เพิ่มไร่ใหม่</h1>
          <p className="text-green-200 mt-1 text-sm">ใช้เวลาไม่ถึง 2 นาที</p>
        </div>

        <div className="px-4 py-6 space-y-6">
          {/* Farm name */}
          <div className="space-y-2">
            <label className="text-sm font-semibold text-gray-700">
              ชื่อไร่ <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={farmName}
              onChange={(e) => setFarmName(e.target.value)}
              placeholder="เช่น ไร่ข้าวหนองแซง"
              className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 text-base focus:outline-none focus:border-green-500"
            />
          </div>

          {/* Crop type */}
          <div className="space-y-2">
            <label className="text-sm font-semibold text-gray-700">
              พืชที่ปลูก <span className="text-red-500">*</span>
            </label>
            <div className="grid grid-cols-2 gap-2">
              {CROP_OPTIONS.map((crop) => (
                <button
                  key={crop.id}
                  onClick={() => setCropType(crop.id)}
                  className={`p-3 rounded-xl border-2 text-left transition-all ${
                    cropType === crop.id
                      ? "border-green-500 bg-green-50"
                      : "border-gray-200 bg-white"
                  }`}
                >
                  <span className="text-xl">{crop.emoji}</span>
                  <p className="text-sm font-medium text-gray-700 mt-1">{crop.label}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Province */}
          <div className="space-y-2">
            <label className="text-sm font-semibold text-gray-700">จังหวัด</label>
            <input
              type="text"
              value={province}
              onChange={(e) => setProvince(e.target.value)}
              placeholder="เช่น เชียงใหม่"
              className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 text-base focus:outline-none focus:border-green-500"
            />
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-3">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}

          <button
            onClick={handleCreateFarm}
            disabled={!farmName || !cropType || saving}
            className="w-full bg-green-600 text-white font-bold py-4 rounded-xl text-lg disabled:opacity-40"
          >
            {saving ? "⏳ กำลังบันทึก..." : "ถัดไป: วาดขอบเขตไร่ →"}
          </button>

          <button
            onClick={() => router.push("/")}
            className="w-full text-center text-gray-500 py-2"
          >
            ข้ามขั้นตอนนี้
          </button>
        </div>
      </div>
    );
  }

  if (step === "boundary") {
    return (
      <div className="h-screen flex flex-col">
        <div className="bg-blue-700 text-white px-4 pt-12 pb-4">
          <h2 className="text-lg font-bold">วาดขอบเขตไร่</h2>
          <p className="text-blue-200 text-sm">แตะแผนที่เพื่อเพิ่มจุดขอบเขต</p>
        </div>
        <div className="flex-1 relative">
          <FarmMap
            farms={[]}
            drawingMode={true}
            onBoundaryComplete={handleBoundaryComplete}
          />
        </div>
        {error && (
          <div className="p-4 bg-red-50 border-t border-red-200">
            <p className="text-sm text-red-600">{error}</p>
          </div>
        )}
        <div className="p-4 bg-white border-t">
          <button
            onClick={() => router.push("/")}
            className="w-full text-center text-gray-500 py-2"
          >
            ข้ามและวาดทีหลัง
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen gap-6 px-4 text-center">
      <div className="text-6xl">🎉</div>
      <h2 className="text-2xl font-bold text-gray-800">เริ่มต้นสำเร็จ!</h2>
      <p className="text-gray-500">
        ไร่ "{farmName}" พร้อมใช้งานแล้ว
        <br />
        สามารถเริ่มสำรวจและติดตามไร่ได้เลย
      </p>
      <button
        onClick={() => router.push("/")}
        className="bg-green-600 text-white font-bold px-8 py-4 rounded-xl text-lg"
      >
        เริ่มใช้งาน →
      </button>
    </div>
  );
}

export default function OnboardingPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center h-screen">กำลังโหลด...</div>}>
      <OnboardingContent />
    </Suspense>
  );
}
