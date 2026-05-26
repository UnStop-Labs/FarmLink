"use client";
import { useState, useEffect } from "react";
import { useFarmStore } from "../store/farm.store";
import { fetchFarms } from "../lib/api/client";
import { cacheFarms, getCachedFarms } from "../lib/db";
import type { CachedFarm } from "../lib/db/schema";

// ============================================================
// useFarm — loads farms with offline fallback
// ============================================================

export function useFarm() {
  const { farms, setFarms, activeFarmId, setActiveFarm, isOnline } = useFarmStore();
  const [loading, setLoading] = useState(farms.length === 0);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadFarms();
  }, [isOnline]);

  async function loadFarms() {
    if (isOnline) {
      try {
        const data = await fetchFarms() as CachedFarm[];
        setFarms(data);
        await cacheFarms(data);
        setLoading(false);
      } catch {
        // Network failed — fall back to cache
        await loadFromCache();
      }
    } else {
      await loadFromCache();
    }
  }

  async function loadFromCache() {
    try {
      const cached = await getCachedFarms();
      setFarms(cached);
    } catch (e) {
      setError("ไม่สามารถโหลดข้อมูลไร่ได้");
    } finally {
      setLoading(false);
    }
  }

  const activeFarm = farms.find((f) => f.id === activeFarmId) ?? farms[0] ?? null;

  return { farms, activeFarm, setActiveFarm, loading, error, refresh: loadFarms };
}
