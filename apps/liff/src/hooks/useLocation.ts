"use client";
import { useState, useCallback } from "react";

export interface GpsPosition {
  lat: number;
  lng: number;
  accuracy: number;
  timestamp: number;
}

export function useLocation() {
  const [position, setPosition] = useState<GpsPosition | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [watching, setWatching] = useState(false);
  const [watchId, setWatchId] = useState<number | null>(null);

  const getPosition = useCallback((): Promise<GpsPosition> => {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error("GPS ไม่รองรับในอุปกรณ์นี้"));
        return;
      }

      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const gps: GpsPosition = {
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
            accuracy: pos.coords.accuracy,
            timestamp: pos.timestamp,
          };
          setPosition(gps);
          setError(null);
          resolve(gps);
        },
        (err) => {
          const msg = err.code === 1
            ? "ไม่ได้รับอนุญาตให้เข้าถึง GPS"
            : "ไม่สามารถรับตำแหน่งได้";
          setError(msg);
          reject(new Error(msg));
        },
        { enableHighAccuracy: true, timeout: 10_000, maximumAge: 5_000 }
      );
    });
  }, []);

  const startWatching = useCallback(() => {
    if (!navigator.geolocation || watching) return;

    const id = navigator.geolocation.watchPosition(
      (pos) => {
        setPosition({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          accuracy: pos.coords.accuracy,
          timestamp: pos.timestamp,
        });
        setError(null);
      },
      (err) => setError(err.message),
      { enableHighAccuracy: true, maximumAge: 2_000 }
    );

    setWatchId(id);
    setWatching(true);
  }, [watching]);

  const stopWatching = useCallback(() => {
    if (watchId !== null) {
      navigator.geolocation.clearWatch(watchId);
      setWatchId(null);
      setWatching(false);
    }
  }, [watchId]);

  return { position, error, watching, getPosition, startWatching, stopWatching };
}
