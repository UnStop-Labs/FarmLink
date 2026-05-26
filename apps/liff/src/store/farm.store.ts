import { create } from "zustand";
import type { CachedFarm } from "../lib/db/schema";
import type { LiffProfile } from "../lib/liff/liff-client";

// ============================================================
// Global Zustand store — app-level state
// ============================================================

export type SyncStatus = "idle" | "syncing" | "success" | "error";

interface FarmStore {
  // User
  profile: LiffProfile | null;
  setProfile: (profile: LiffProfile) => void;

  // Farms
  farms: CachedFarm[];
  activeFarmId: string | null;
  setFarms: (farms: CachedFarm[]) => void;
  setActiveFarm: (id: string | null) => void;
  getActiveFarm: () => CachedFarm | null;

  // Network & sync
  isOnline: boolean;
  setOnline: (online: boolean) => void;
  syncStatus: SyncStatus;
  setSyncStatus: (status: SyncStatus) => void;
  pendingSyncCount: number;
  setPendingSyncCount: (count: number) => void;

  // Map state
  mapCenter: [number, number]; // [lng, lat]
  mapZoom: number;
  setMapView: (center: [number, number], zoom: number) => void;
  isDrawingMode: boolean;
  setDrawingMode: (drawing: boolean) => void;
}

export const useFarmStore = create<FarmStore>((set, get) => ({
  // User
  profile: null,
  setProfile: (profile) => set({ profile }),

  // Farms
  farms: [],
  activeFarmId: null,
  setFarms: (farms) => set({ farms }),
  setActiveFarm: (id) => set({ activeFarmId: id }),
  getActiveFarm: () => {
    const { farms, activeFarmId } = get();
    return farms.find((f) => f.id === activeFarmId) ?? null;
  },

  // Network
  isOnline: typeof navigator !== "undefined" ? navigator.onLine : true,
  setOnline: (isOnline) => set({ isOnline }),
  syncStatus: "idle",
  setSyncStatus: (syncStatus) => set({ syncStatus }),
  pendingSyncCount: 0,
  setPendingSyncCount: (pendingSyncCount) => set({ pendingSyncCount }),

  // Map — default center on Thailand
  mapCenter: [100.9925, 15.8700],
  mapZoom: 6,
  setMapView: (mapCenter, mapZoom) => set({ mapCenter, mapZoom }),
  isDrawingMode: false,
  setDrawingMode: (isDrawingMode) => set({ isDrawingMode }),
}));
