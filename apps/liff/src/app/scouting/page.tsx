"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { Suspense } from "react";
import { useFarm } from "../../hooks/useFarm";
import ScoutingForm from "../../components/scouting/ScoutingForm";

function ScoutingPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { activeFarm } = useFarm();

  const lat = searchParams.get("lat") ? parseFloat(searchParams.get("lat")!) : undefined;
  const lng = searchParams.get("lng") ? parseFloat(searchParams.get("lng")!) : undefined;

  if (!activeFarm) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center p-4">
          <p className="text-gray-500 mb-4">ยังไม่มีไร่ที่ลงทะเบียน</p>
          <button
            onClick={() => router.push("/onboarding")}
            className="bg-green-600 text-white px-6 py-3 rounded-xl"
          >
            เพิ่มไร่
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen">
      <ScoutingForm
        farmId={activeFarm.id}
        initialLat={lat}
        initialLng={lng}
        onSaved={() => {
          router.push("/map");
        }}
        onCancel={() => router.back()}
      />
    </div>
  );
}

export default function ScoutingPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center h-screen">กำลังโหลด...</div>}>
      <ScoutingPageContent />
    </Suspense>
  );
}
