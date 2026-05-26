"use client";

import { useState, useRef } from "react";
import { saveObservationLocally } from "../../lib/db";
import { getPresignedUploadUrl, uploadFileToS3 } from "../../lib/api/client";
import { useFarmStore } from "../../store/farm.store";
import { useLocation } from "../../hooks/useLocation";
import PhotoCapture from "./PhotoCapture";

// ============================================================
// Scouting Form — offline-first field observation entry
// ============================================================

const OBSERVATION_TYPES = [
  { id: "disease", label: "โรคพืช", emoji: "🍂" },
  { id: "pest", label: "แมลง/ศัตรูพืช", emoji: "🐛" },
  { id: "nutrient_deficiency", label: "ขาดธาตุอาหาร", emoji: "🌿" },
  { id: "irrigation", label: "ปัญหาน้ำ", emoji: "💧" },
  { id: "weed", label: "วัชพืช", emoji: "🌱" },
  { id: "harvest_ready", label: "พร้อมเก็บเกี่ยว", emoji: "🌾" },
  { id: "general", label: "บันทึกทั่วไป", emoji: "📋" },
];

const SEVERITY_LEVELS = [
  { id: "low", label: "น้อย", color: "bg-green-100 text-green-700" },
  { id: "medium", label: "ปานกลาง", color: "bg-yellow-100 text-yellow-700" },
  { id: "high", label: "มาก", color: "bg-orange-100 text-orange-700" },
  { id: "critical", label: "วิกฤต", color: "bg-red-100 text-red-700" },
];

interface ScoutingFormProps {
  farmId: string;
  initialLat?: number;
  initialLng?: number;
  onSaved?: () => void;
  onCancel?: () => void;
}

export default function ScoutingForm({
  farmId,
  initialLat,
  initialLng,
  onSaved,
  onCancel,
}: ScoutingFormProps) {
  const { isOnline } = useFarmStore();
  const { position, getPosition } = useLocation();

  const [step, setStep] = useState<"type" | "details" | "photo" | "saving">("type");
  const [obsType, setObsType] = useState<string>("");
  const [severity, setSeverity] = useState<string>("");
  const [description, setDescription] = useState<string>("");
  const [photos, setPhotos] = useState<File[]>([]);
  const [gpsLat, setGpsLat] = useState<number | null>(initialLat ?? null);
  const [gpsLng, setGpsLng] = useState<number | null>(initialLng ?? null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const getGps = async () => {
    try {
      const pos = await getPosition();
      setGpsLat(pos.lat);
      setGpsLng(pos.lng);
    } catch {
      setError("ไม่สามารถรับ GPS ได้ กรุณาตรวจสอบการอนุญาต");
    }
  };

  const handleSave = async () => {
    if (!gpsLat || !gpsLng) {
      setError("กรุณาระบุตำแหน่ง GPS ก่อนบันทึก");
      return;
    }

    setSaving(true);
    setError(null);

    try {
      let imageS3Keys: string[] = [];
      let imageDataUrls: string[] = [];

      // If online, upload photos to S3 immediately
      if (isOnline && photos.length > 0) {
        const uploadPromises = photos.map(async (photo) => {
          const { upload_url, key } = await getPresignedUploadUrl(
            photo.type,
            "photos"
          );
          await uploadFileToS3(photo, upload_url);
          return key;
        });
        imageS3Keys = await Promise.all(uploadPromises);
      } else if (photos.length > 0) {
        // Offline: store as base64 data URLs, upload later during sync
        imageDataUrls = await Promise.all(
          photos.map((photo) => fileToDataUrl(photo))
        );
      }

      // Save locally (always — works offline)
      await saveObservationLocally({
        farm_id: farmId,
        lat: gpsLat,
        lng: gpsLng,
        observation_type: obsType,
        severity: severity || undefined,
        description: description || undefined,
        labels: [obsType],
        image_data_urls: imageDataUrls,
        image_s3_keys: imageS3Keys,
        observed_at: Date.now(),
      });

      onSaved?.();
    } catch (err) {
      setError("เกิดข้อผิดพลาด กรุณาลองอีกครั้ง");
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-white">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b">
        <button onClick={onCancel} className="text-gray-500">
          ← กลับ
        </button>
        <h2 className="font-semibold text-gray-800">บันทึกการสำรวจ</h2>
        <div className="w-10" />
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-5">
        {/* Step 1: Observation Type */}
        <section>
          <h3 className="font-semibold text-gray-700 mb-3">
            1. ประเภทการสำรวจ
          </h3>
          <div className="grid grid-cols-2 gap-2">
            {OBSERVATION_TYPES.map((type) => (
              <button
                key={type.id}
                onClick={() => setObsType(type.id)}
                className={`p-3 rounded-xl border-2 text-left transition-all ${
                  obsType === type.id
                    ? "border-green-500 bg-green-50"
                    : "border-gray-200"
                }`}
              >
                <span className="text-xl">{type.emoji}</span>
                <p className="text-sm font-medium text-gray-700 mt-1">
                  {type.label}
                </p>
              </button>
            ))}
          </div>
        </section>

        {/* Step 2: Severity */}
        {obsType && (
          <section>
            <h3 className="font-semibold text-gray-700 mb-3">
              2. ระดับความรุนแรง
            </h3>
            <div className="flex gap-2 flex-wrap">
              {SEVERITY_LEVELS.map((level) => (
                <button
                  key={level.id}
                  onClick={() => setSeverity(level.id)}
                  className={`px-4 py-2 rounded-full text-sm font-medium border-2 transition-all ${
                    severity === level.id
                      ? `${level.color} border-current`
                      : "border-gray-200 text-gray-600"
                  }`}
                >
                  {level.label}
                </button>
              ))}
            </div>
          </section>
        )}

        {/* Step 3: Description */}
        {obsType && (
          <section>
            <h3 className="font-semibold text-gray-700 mb-3">
              3. รายละเอียด (ไม่บังคับ)
            </h3>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="อธิบายสิ่งที่พบ..."
              rows={3}
              className="w-full border border-gray-200 rounded-xl p-3 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-green-500"
            />
          </section>
        )}

        {/* Step 4: Photos */}
        {obsType && (
          <section>
            <h3 className="font-semibold text-gray-700 mb-3">
              4. ถ่ายรูป (ไม่บังคับ)
            </h3>
            <PhotoCapture
              photos={photos}
              onPhotosChange={setPhotos}
              maxPhotos={4}
            />
          </section>
        )}

        {/* Step 5: GPS Location */}
        {obsType && (
          <section>
            <h3 className="font-semibold text-gray-700 mb-3">
              5. ตำแหน่ง GPS
            </h3>
            {gpsLat && gpsLng ? (
              <div className="bg-green-50 border border-green-200 rounded-xl p-3">
                <p className="text-sm text-green-700 font-medium">
                  ✅ บันทึก GPS แล้ว
                </p>
                <p className="text-xs text-green-600 mt-1">
                  {gpsLat.toFixed(6)}, {gpsLng.toFixed(6)}
                </p>
                <button
                  onClick={getGps}
                  className="text-xs text-green-600 underline mt-1"
                >
                  อัพเดทตำแหน่ง
                </button>
              </div>
            ) : (
              <button
                onClick={getGps}
                className="w-full bg-blue-50 border-2 border-dashed border-blue-300 rounded-xl p-4 text-blue-600 font-medium"
              >
                📍 บันทึกตำแหน่งปัจจุบัน
              </button>
            )}
          </section>
        )}

        {/* Error */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-3">
            <p className="text-sm text-red-600">{error}</p>
          </div>
        )}

        {/* Offline notice */}
        {!isOnline && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-3">
            <p className="text-sm text-amber-700">
              📴 บันทึกแบบออฟไลน์ — ข้อมูลจะอัปโหลดเมื่อมีอินเทอร์เน็ต
            </p>
          </div>
        )}
      </div>

      {/* Save button */}
      <div className="p-4 border-t">
        <button
          onClick={handleSave}
          disabled={!obsType || !gpsLat || saving}
          className="w-full bg-green-600 text-white font-semibold py-4 rounded-xl disabled:opacity-40 text-lg"
        >
          {saving ? "⏳ กำลังบันทึก..." : "💾 บันทึกการสำรวจ"}
        </button>
      </div>
    </div>
  );
}

async function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}
