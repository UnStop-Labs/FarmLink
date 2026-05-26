"use client";
import { useEffect } from "react";
import { useFarmStore } from "../store/farm.store";
import { runSync } from "../lib/sync/sync-engine";

// ============================================================
// useOffline — monitors network status and triggers sync
// ============================================================

export function useOffline() {
  const { isOnline, setOnline, profile, setSyncStatus, setPendingSyncCount } =
    useFarmStore();

  useEffect(() => {
    const handleOnline = async () => {
      setOnline(true);
      if (profile?.userId) {
        setSyncStatus("syncing");
        await runSync(profile.userId, null, {
          onSuccess: () => setSyncStatus("success"),
          onError: () => setSyncStatus("error"),
        });
        setTimeout(() => setSyncStatus("idle"), 3000);
      }
    };

    const handleOffline = () => setOnline(false);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    // Background sync message from service worker
    const handleSwMessage = (event: MessageEvent) => {
      if (event.data?.type === "BACKGROUND_SYNC") {
        handleOnline();
      }
    };
    navigator.serviceWorker?.addEventListener("message", handleSwMessage);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
      navigator.serviceWorker?.removeEventListener("message", handleSwMessage);
    };
  }, [profile?.userId]);

  return { isOnline };
}
