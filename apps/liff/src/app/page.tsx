"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useFarmStore } from "../store/farm.store";
import { useFarm } from "../hooks/useFarm";
import BottomNav from "../components/ui/BottomNav";
import SyncStatus from "../components/sync/SyncStatus";

// ============================================================
// Home / Dashboard page
// Shows farm health cards and quick actions
// ============================================================

export default function HomePage() {
  const { profile, isOnline } = useFarmStore();
  const { farms, activeFarm, loading } = useFarm();
  const router = useRouter();

  // Redirect to onboarding if no farms
  useEffect(() => {
    if (!loading && farms.length === 0) {
      router.push("/onboarding");
    }
  }, [loading, farms.length]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="text-4xl mb-4">🌾</div>
          <p className="text-gray-500">กำลังโหลด...</p>
        </div>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-gray-50 pb-20">
      {/* Header */}
      <div className="bg-green-700 text-white px-4 pt-12 pb-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-green-200 text-sm">สวัสดี,</p>
            <h1 className="text-xl font-bold">
              {profile?.displayName ?? "เกษตรกร"} 👋
            </h1>
          </div>
          <div className="text-right">
            <SyncStatus />
            {!isOnline && (
              <span className="text-xs bg-amber-400 text-amber-900 px-2 py-0.5 rounded-full">
                ออฟไลน์
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="px-4 py-5 space-y-5">
        {/* Active farm card */}
        {activeFarm && (
          <div
            className="bg-white rounded-2xl shadow-sm overflow-hidden cursor-pointer"
            onClick={() => router.push("/map")}
          >
            <div className="bg-green-50 px-4 py-3 border-b">
              <p className="text-xs text-green-700 font-medium">ไร่ที่ใช้งาน</p>
              <h2 className="text-lg font-bold text-gray-800">{activeFarm.name}</h2>
            </div>
            <div className="px-4 py-3 grid grid-cols-3 gap-3 text-center">
              <div>
                <p className="text-2xl">🌱</p>
                <p className="text-xs text-gray-500 mt-1">พืช</p>
                <p className="text-sm font-semibold">{cropLabel(activeFarm.crop_type)}</p>
              </div>
              <div>
                <p className="text-2xl">📐</p>
                <p className="text-xs text-gray-500 mt-1">พื้นที่</p>
                <p className="text-sm font-semibold">
                  {activeFarm.area_rai ? `${activeFarm.area_rai} ไร่` : "-"}
                </p>
              </div>
              <div>
                <p className="text-2xl">📍</p>
                <p className="text-xs text-gray-500 mt-1">จังหวัด</p>
                <p className="text-sm font-semibold">{activeFarm.province ?? "-"}</p>
              </div>
            </div>
          </div>
        )}

        {/* Quick actions */}
        <h2 className="font-semibold text-gray-700">เมนูหลัก</h2>
        <div className="grid grid-cols-2 gap-3">
          <QuickAction
            emoji="🗺️"
            title="แผนที่ไร่"
            subtitle="ดูขอบเขตและ NDVI"
            color="bg-blue-50"
            onClick={() => router.push("/map")}
          />
          <QuickAction
            emoji="🔍"
            title="สำรวจไร่"
            subtitle="บันทึกปัญหาในแปลง"
            color="bg-amber-50"
            onClick={() => router.push("/scouting")}
          />
          <QuickAction
            emoji="🌾"
            title="เก็บเกี่ยว"
            subtitle="บันทึกผลผลิต"
            color="bg-green-50"
            onClick={() => router.push("/harvest")}
          />
          <QuickAction
            emoji="📊"
            title="รายงาน"
            subtitle="ดาวเทียมและ NDVI"
            color="bg-purple-50"
            onClick={() => router.push("/map")}
          />
        </div>

        {/* Multiple farms */}
        {farms.length > 1 && (
          <div>
            <h2 className="font-semibold text-gray-700 mb-3">ไร่ทั้งหมด</h2>
            <div className="space-y-2">
              {farms.map((farm) => (
                <button
                  key={farm.id}
                  onClick={() => {
                    useFarmStore.getState().setActiveFarm(farm.id);
                    router.push("/map");
                  }}
                  className="w-full bg-white rounded-xl p-3 flex items-center gap-3 shadow-sm text-left"
                >
                  <span className="text-2xl">{cropEmoji(farm.crop_type)}</span>
                  <div className="flex-1">
                    <p className="font-semibold text-gray-800">{farm.name}</p>
                    <p className="text-xs text-gray-500">{farm.province}</p>
                  </div>
                  <span className="text-gray-400">›</span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      <BottomNav />
    </main>
  );
}

function QuickAction({
  emoji, title, subtitle, color, onClick,
}: {
  emoji: string; title: string; subtitle: string; color: string; onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`${color} rounded-2xl p-4 text-left flex flex-col gap-1 active:scale-95 transition-transform`}
    >
      <span className="text-3xl">{emoji}</span>
      <p className="font-semibold text-gray-800 text-sm mt-1">{title}</p>
      <p className="text-xs text-gray-500">{subtitle}</p>
    </button>
  );
}

function cropLabel(type: string): string {
  const labels: Record<string, string> = {
    rice: "ข้าว", sugarcane: "อ้อย", cassava: "มันสำปะหลัง",
    corn: "ข้าวโพด", rubber: "ยางพารา", durian: "ทุเรียน",
    mango: "มะม่วง", vegetable: "ผัก",
  };
  return labels[type] ?? type;
}

function cropEmoji(type: string): string {
  const emojis: Record<string, string> = {
    rice: "🌾", sugarcane: "🎋", cassava: "🌿", corn: "🌽",
    rubber: "🌳", durian: "🌟", mango: "🥭", vegetable: "🥬",
  };
  return emojis[type] ?? "🌱";
}
