"use client";

import { useFarmStore } from "../../store/farm.store";
import { getPendingSyncCount } from "../../lib/db";
import { useEffect, useState } from "react";
import { runSync } from "../../lib/sync/sync-engine";

export default function SyncStatus() {
  const { syncStatus, isOnline, pendingSyncCount, setSyncStatus, profile } = useFarmStore();
  const [count, setCount] = useState(0);

  useEffect(() => {
    getPendingSyncCount().then(setCount);
    const interval = setInterval(() => {
      getPendingSyncCount().then(setCount);
    }, 10_000);
    return () => clearInterval(interval);
  }, []);

  const handleManualSync = async () => {
    if (!profile?.userId || !isOnline) return;
    setSyncStatus("syncing");
    await runSync(profile.userId, null, {
      onSuccess: () => setSyncStatus("success"),
      onError: () => setSyncStatus("error"),
    });
    setTimeout(() => setSyncStatus("idle"), 3000);
  };

  if (syncStatus === "syncing") {
    return (
      <div className="flex items-center gap-2 text-blue-600 text-sm">
        <span className="animate-spin">⟳</span>
        <span>กำลังซิงค์...</span>
      </div>
    );
  }

  if (syncStatus === "success") {
    return (
      <div className="flex items-center gap-2 text-green-600 text-sm">
        <span>✅</span>
        <span>ซิงค์สำเร็จ</span>
      </div>
    );
  }

  if (count > 0) {
    return (
      <button
        onClick={handleManualSync}
        disabled={!isOnline}
        className="flex items-center gap-2 text-amber-600 text-sm bg-amber-50 px-3 py-1 rounded-full"
      >
        <span className="w-5 h-5 bg-amber-500 text-white text-xs rounded-full flex items-center justify-center">
          {count}
        </span>
        <span>{isOnline ? "ซิงค์ตอนนี้" : "รอออนไลน์"}</span>
      </button>
    );
  }

  return null;
}
