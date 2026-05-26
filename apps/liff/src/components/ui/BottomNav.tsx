"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV_ITEMS = [
  { href: "/map", label: "แผนที่", emoji: "🗺️" },
  { href: "/scouting", label: "สำรวจ", emoji: "🔍" },
  { href: "/", label: "หน้าหลัก", emoji: "🏠" },
  { href: "/harvest", label: "เก็บเกี่ยว", emoji: "🌾" },
  { href: "/profile", label: "โปรไฟล์", emoji: "👤" },
];

export default function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-50 safe-area-pb">
      <div className="flex items-center justify-around px-2 py-2">
        {NAV_ITEMS.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-col items-center gap-0.5 px-3 py-1 rounded-xl transition-all ${
                isActive
                  ? "text-green-700 bg-green-50"
                  : "text-gray-500"
              }`}
            >
              <span className="text-2xl">{item.emoji}</span>
              <span className="text-xs font-medium">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
