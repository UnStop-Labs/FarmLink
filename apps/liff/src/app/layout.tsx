import type { Metadata, Viewport } from "next";
import "./globals.css";
import AppProviders from "./providers";

export const metadata: Metadata = {
  title: "FarmLink — ผู้ช่วยดูแลไร่",
  description: "แอปดูแลไร่อัจฉริยะสำหรับเกษตรกรไทย ใช้งานได้แม้ไม่มีอินเทอร์เน็ต",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "FarmLink",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: "#2D7A35",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="th">
      <head>
        <link rel="apple-touch-icon" href="/icons/icon-192.png" />
        <meta name="mobile-web-app-capable" content="yes" />
      </head>
      <body className="bg-gray-50 font-sans antialiased">
        <AppProviders>{children}</AppProviders>
      </body>
    </html>
  );
}
