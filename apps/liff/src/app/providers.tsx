"use client";

import { useEffect } from "react";
import { initLiff, getLiffProfile } from "../lib/liff/liff-client";
import { useFarmStore } from "../store/farm.store";
import { useOffline } from "../hooks/useOffline";

// ============================================================
// AppProviders — initializes LIFF and global state
// ============================================================

export default function AppProviders({ children }: { children: React.ReactNode }) {
  const { setProfile, setOnline } = useFarmStore();
  useOffline(); // sets up online/offline listeners

  useEffect(() => {
    // Register service worker
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker
        .register("/sw.js")
        .then(() => console.log("[App] Service Worker registered"))
        .catch(console.error);
    }

    // Initialize LIFF SDK
    initLiff()
      .then(() => getLiffProfile())
      .then((profile) => setProfile(profile))
      .catch(console.error);

    // Set initial online state
    setOnline(navigator.onLine);
  }, []);

  return <>{children}</>;
}
