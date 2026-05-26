"use client";

import dynamic from "next/dynamic";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useFarm } from "../../hooks/useFarm";
import { useFarmStore } from "../../store/farm.store";
import { updateFarmBoundary } from "../../lib/api/client";
import BottomNav from "../../components/ui/BottomNav";

// Dynamic import — MapLibre must be client-side only
const FarmMap = dynamic(() => import("../../components/map/FarmMap"), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full flex items-center justify-center bg-gray-100">
      <p className="text-gray-500">กำลังโหลดแผนที่...</p>
    </div>
  ),
});

// ============================================================
// Map Page — full-screen interactive farm map
// ============================================================

export default function MapPage() {
  const router = useRouter();
  const { farms, activeFarm } = useFarm();
  const { isDrawingMode, setDrawingMode } = useFarmStore();
  const [saving, setSaving] = useState(false);
  const [showFarmSelector, setShowFarmSelector] = useState(false);
  const { setActiveFarm } = useFarmStore();

  const handleBoundaryComplete = async (points: [number, number][]) => {
    if (!activeFarm) return;

    setSaving(true);
    try {
      const polygon = {
        type: "Polygon" as const,
        coordinates: [[...points, points[0]]], // Close the ring
      };
      await updateFarmBoundary(activeFarm.id, polygon);
      setDrawingMode(false);
      alert("✅ บันทึกขอบเขตไร่สำเร็จ!");
    } catch (err) {
      alert("เกิดข้อผิดพลาด กรุณาลองอีกครั้ง");
    } finally {
      setSaving(false);
    }
  };

  return (
    <main className="h-screen flex flex-col">
      {/* Top bar */}
      <div className="absolute top-0 left-0 right-0 z-10 p-4 flex items-center justify-between pointer-events-none">
        <button
          onClick={() => router.back()}
          className="pointer-events-auto w-10 h-10 bg-white rounded-full shadow-lg flex items-center justify-center text-gray-700"
        >
          ←
        </button>

        {/* Farm selector */}
        <button
          onClick={() => setShowFarmSelector(true)}
          className="pointer-events-auto bg-white rounded-full shadow-lg px-4 py-2 flex items-center gap-2"
        >
          <span className="text-sm font-semibold text-gray-800">
            {activeFarm?.name ?? "เลือกไร่"}
          </span>
          <span className="text-xs text-gray-400">▼</span>
        </button>

        {/* Draw boundary button */}
        <button
          onClick={() => setDrawingMode(!isDrawingMode)}
          className={`pointer-events-auto w-10 h-10 rounded-full shadow-lg flex items-center justify-center ${
            isDrawingMode ? "bg-green-600 text-white" : "bg-white text-gray-700"
          }`}
        >
          ✏️
        </button>
      </div>

      {/* Full-screen map */}
      <div className="flex-1 relative">
        <FarmMap
          farms={farms}
          drawingMode={isDrawingMode}
          onBoundaryComplete={handleBoundaryComplete}
          onFarmClick={(farmId) => setActiveFarm(farmId)}
          onMapClick={(lat, lng) => {
            if (!isDrawingMode) {
              router.push(`/scouting?lat=${lat}&lng=${lng}`);
            }
          }}
        />
      </div>

      {/* Farm selector modal */}
      {showFarmSelector && (
        <div className="absolute inset-0 bg-black/50 z-20 flex items-end">
          <div className="bg-white w-full rounded-t-2xl p-4">
            <h3 className="font-bold text-gray-800 mb-4">เลือกไร่</h3>
            {farms.map((farm) => (
              <button
                key={farm.id}
                onClick={() => {
                  setActiveFarm(farm.id);
                  setShowFarmSelector(false);
                }}
                className={`w-full text-left p-3 rounded-xl mb-2 border-2 ${
                  activeFarm?.id === farm.id
                    ? "border-green-500 bg-green-50"
                    : "border-gray-100"
                }`}
              >
                <p className="font-semibold">{farm.name}</p>
                <p className="text-sm text-gray-500">{farm.crop_type} · {farm.province}</p>
              </button>
            ))}
            <button
              onClick={() => setShowFarmSelector(false)}
              className="w-full text-center text-gray-500 py-3 mt-2"
            >
              ปิด
            </button>
          </div>
        </div>
      )}

      <BottomNav />
    </main>
  );
}
