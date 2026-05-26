"use client";

import { useRef } from "react";

interface PhotoCaptureProps {
  photos: File[];
  onPhotosChange: (photos: File[]) => void;
  maxPhotos?: number;
}

export default function PhotoCapture({
  photos,
  onPhotosChange,
  maxPhotos = 4,
}: PhotoCaptureProps) {
  const cameraRef = useRef<HTMLInputElement>(null);
  const galleryRef = useRef<HTMLInputElement>(null);

  const handleFiles = (files: FileList | null) => {
    if (!files) return;
    const newPhotos = Array.from(files).slice(0, maxPhotos - photos.length);
    onPhotosChange([...photos, ...newPhotos]);
  };

  const removePhoto = (index: number) => {
    onPhotosChange(photos.filter((_, i) => i !== index));
  };

  return (
    <div className="space-y-3">
      {/* Photo previews */}
      {photos.length > 0 && (
        <div className="grid grid-cols-2 gap-2">
          {photos.map((photo, i) => (
            <div key={i} className="relative aspect-square rounded-xl overflow-hidden bg-gray-100">
              <img
                src={URL.createObjectURL(photo)}
                alt={`Photo ${i + 1}`}
                className="w-full h-full object-cover"
              />
              <button
                onClick={() => removePhoto(i)}
                className="absolute top-1 right-1 w-6 h-6 bg-red-500 text-white rounded-full text-xs flex items-center justify-center"
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Add photo buttons */}
      {photos.length < maxPhotos && (
        <div className="flex gap-3">
          {/* Camera capture */}
          <button
            onClick={() => cameraRef.current?.click()}
            className="flex-1 flex flex-col items-center justify-center gap-1 border-2 border-dashed border-gray-300 rounded-xl py-4 text-gray-500"
          >
            <span className="text-2xl">📷</span>
            <span className="text-xs">ถ่ายรูป</span>
          </button>

          {/* Gallery picker */}
          <button
            onClick={() => galleryRef.current?.click()}
            className="flex-1 flex flex-col items-center justify-center gap-1 border-2 border-dashed border-gray-300 rounded-xl py-4 text-gray-500"
          >
            <span className="text-2xl">🖼️</span>
            <span className="text-xs">คลังรูป</span>
          </button>
        </div>
      )}

      {/* Hidden file inputs */}
      <input
        ref={cameraRef}
        type="file"
        accept="image/*"
        capture="environment"  // Opens rear camera on mobile
        multiple
        className="hidden"
        onChange={(e) => handleFiles(e.target.files)}
      />
      <input
        ref={galleryRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={(e) => handleFiles(e.target.files)}
      />
    </div>
  );
}
