"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useFarm } from "../../hooks/useFarm";
import { useFarmStore } from "../../store/farm.store";
import { saveHarvestLocally } from "../../lib/db";
import BottomNav from "../../components/ui/BottomNav";

// ============================================================
// Harvest Log Page — offline-first harvest recording
// ============================================================

export default function HarvestPage() {
  const router = useRouter();
  const { activeFarm } = useFarm();
  const { isOnline } = useFarmStore();

  const [harvestDate, setHarvestDate] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [estimatedYield, setEstimatedYield] = useState("");
  const [actualYield, setActualYield] = useState("");
  const [pricePerKg, setPricePerKg] = useState("");
  const [qualityNotes, setQualityNotes] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const handleSave = async () => {
    if (!activeFarm) return;
    setSaving(true);

    try {
      await saveHarvestLocally({
        farm_id: activeFarm.id,
        harvest_date: harvestDate,
        crop_type: activeFarm.crop_type,
        estimated_yield_kg: estimatedYield ? parseFloat(estimatedYield) : undefined,
        actual_yield_kg: actualYield ? parseFloat(actualYield) : undefined,
        price_per_kg: pricePerKg ? parseFloat(pricePerKg) : undefined,
        quality_notes: qualityNotes || undefined,
        notes: notes || undefined,
        created_at: Date.now(),
      });

      setSaved(true);
      setTimeout(() => router.push("/"), 1500);
    } catch (err) {
      alert("เกิดข้อผิดพลาด กรุณาลองอีกครั้ง");
    } finally {
      setSaving(false);
    }
  };

  if (saved) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-4">
        <div className="text-6xl">✅</div>
        <h2 className="text-xl font-bold text-gray-800">บันทึกสำเร็จ!</h2>
        <p className="text-gray-500">
          {!isOnline ? "จะอัปโหลดเมื่อมีอินเทอร์เน็ต" : "บันทึกเรียบร้อย"}
        </p>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-gray-50 pb-20">
      {/* Header */}
      <div className="bg-green-700 text-white px-4 pt-12 pb-6">
        <button onClick={() => router.back()} className="text-green-200 text-sm mb-2">
          ← กลับ
        </button>
        <h1 className="text-xl font-bold">🌾 บันทึกการเก็บเกี่ยว</h1>
        {activeFarm && (
          <p className="text-green-200 text-sm mt-1">{activeFarm.name}</p>
        )}
      </div>

      <div className="px-4 py-5 space-y-5">
        {/* Harvest date */}
        <FormGroup label="วันที่เก็บเกี่ยว">
          <input
            type="date"
            value={harvestDate}
            onChange={(e) => setHarvestDate(e.target.value)}
            className="w-full border border-gray-200 rounded-xl px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-green-500"
          />
        </FormGroup>

        {/* Estimated yield */}
        <FormGroup label="ผลผลิตที่คาดว่าจะได้ (กก.)">
          <input
            type="number"
            inputMode="decimal"
            value={estimatedYield}
            onChange={(e) => setEstimatedYield(e.target.value)}
            placeholder="เช่น 3000"
            className="w-full border border-gray-200 rounded-xl px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-green-500"
          />
        </FormGroup>

        {/* Actual yield */}
        <FormGroup label="ผลผลิตจริง (กก.)">
          <input
            type="number"
            inputMode="decimal"
            value={actualYield}
            onChange={(e) => setActualYield(e.target.value)}
            placeholder="เช่น 2850"
            className="w-full border border-gray-200 rounded-xl px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-green-500"
          />
        </FormGroup>

        {/* Price per kg */}
        <FormGroup label="ราคาต่อกิโลกรัม (บาท)">
          <input
            type="number"
            inputMode="decimal"
            value={pricePerKg}
            onChange={(e) => setPricePerKg(e.target.value)}
            placeholder="เช่น 12.50"
            className="w-full border border-gray-200 rounded-xl px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-green-500"
          />
        </FormGroup>

        {/* Revenue preview */}
        {actualYield && pricePerKg && (
          <div className="bg-green-50 border border-green-200 rounded-xl p-4">
            <p className="text-sm text-green-600 font-medium">รายได้โดยประมาณ</p>
            <p className="text-2xl font-bold text-green-700 mt-1">
              ฿{(parseFloat(actualYield) * parseFloat(pricePerKg)).toLocaleString("th-TH", { maximumFractionDigits: 0 })}
            </p>
          </div>
        )}

        {/* Quality */}
        <FormGroup label="คุณภาพ (ไม่บังคับ)">
          <input
            type="text"
            value={qualityNotes}
            onChange={(e) => setQualityNotes(e.target.value)}
            placeholder="เช่น เกรด A, ความชื้น 15%"
            className="w-full border border-gray-200 rounded-xl px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-green-500"
          />
        </FormGroup>

        {/* Notes */}
        <FormGroup label="หมายเหตุ (ไม่บังคับ)">
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
            placeholder="บันทึกเพิ่มเติม..."
            className="w-full border border-gray-200 rounded-xl px-4 py-3 text-base resize-none focus:outline-none focus:ring-2 focus:ring-green-500"
          />
        </FormGroup>

        {/* Offline notice */}
        {!isOnline && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-3">
            <p className="text-sm text-amber-700">
              📴 บันทึกแบบออฟไลน์ — จะซิงค์เมื่อมีอินเทอร์เน็ต
            </p>
          </div>
        )}

        {/* Save button */}
        <button
          onClick={handleSave}
          disabled={!activeFarm || saving}
          className="w-full bg-green-600 text-white font-bold py-4 rounded-xl text-lg disabled:opacity-40"
        >
          {saving ? "⏳ กำลังบันทึก..." : "💾 บันทึกการเก็บเกี่ยว"}
        </button>
      </div>

      <BottomNav />
    </main>
  );
}

function FormGroup({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <label className="text-sm font-semibold text-gray-700">{label}</label>
      {children}
    </div>
  );
}
