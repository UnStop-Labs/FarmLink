/** @type {import('next').NextConfig} */
const nextConfig = {
  // PWA: handled via custom service worker in /public/sw.js
  // For production, consider next-pwa package for auto-generation

  // Allow LIFF to be embedded in LINE's in-app browser
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          // Required for LINE LIFF
          { key: "X-Frame-Options", value: "ALLOWALL" },
          // Service Worker scope
          {
            key: "Service-Worker-Allowed",
            value: "/",
          },
        ],
      },
    ];
  },

  // Transpile MapLibre for Next.js
  transpilePackages: ["maplibre-gl"],

  // Environment variables exposed to the browser
  env: {
    NEXT_PUBLIC_LIFF_ID: process.env.NEXT_PUBLIC_LIFF_ID,
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL,
    NEXT_PUBLIC_SUPABASE_URL: process.env.SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.SUPABASE_ANON_KEY,
  },

  // Webpack: handle maplibre-gl worker
  webpack: (config) => {
    config.resolve.fallback = { fs: false, path: false };
    return config;
  },
};

module.exports = nextConfig;
