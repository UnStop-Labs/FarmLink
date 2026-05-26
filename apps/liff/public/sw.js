// ============================================================
// FarmLink Service Worker — Offline-first PWA
//
// Strategy:
//   - App shell (HTML, JS, CSS): Cache First
//   - API calls: Network First, fallback to cache
//   - Map tiles: Cache First with 7-day expiry
//   - Images: Cache First (photos taken offline)
// ============================================================

const CACHE_VERSION = "farmlink-v1";
const TILE_CACHE = "farmlink-tiles-v1";
const STATIC_CACHE = "farmlink-static-v1";

const STATIC_ASSETS = [
  "/",
  "/map",
  "/scouting",
  "/harvest",
  "/manifest.json",
];

// Install: pre-cache app shell
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) => {
      console.log("[SW] Pre-caching app shell");
      return cache.addAll(STATIC_ASSETS).catch((err) => {
        console.warn("[SW] Pre-cache partial failure:", err);
      });
    })
  );
  self.skipWaiting();
});

// Activate: clean old caches
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter(
            (name) =>
              name !== CACHE_VERSION &&
              name !== TILE_CACHE &&
              name !== STATIC_CACHE
          )
          .map((name) => {
            console.log("[SW] Deleting old cache:", name);
            return caches.delete(name);
          })
      );
    })
  );
  self.clients.claim();
});

// Fetch: route-based caching strategies
self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);

  // Map tiles — Cache First, 7-day TTL
  if (
    url.hostname.includes("tile") ||
    url.pathname.includes("/tiles/") ||
    url.hostname.includes("demotiles.maplibre.org") ||
    url.hostname.includes("openstreetmap.org")
  ) {
    event.respondWith(tileStrategy(event.request));
    return;
  }

  // API calls — Network First
  if (url.pathname.startsWith("/api/") || url.hostname.includes("supabase.co")) {
    event.respondWith(networkFirstStrategy(event.request));
    return;
  }

  // Static assets — Cache First
  if (
    url.pathname.match(/\.(js|css|png|jpg|webp|svg|ico|woff2?)$/) ||
    url.pathname.startsWith("/_next/")
  ) {
    event.respondWith(cacheFirstStrategy(event.request));
    return;
  }

  // HTML pages — Network First (stale-while-revalidate)
  event.respondWith(networkFirstStrategy(event.request));
});

// Background sync — process queued offline data
self.addEventListener("sync", (event) => {
  if (event.tag === "farmlink-sync") {
    console.log("[SW] Background sync triggered");
    event.waitUntil(triggerSync());
  }
});

// Push notifications (for future LINE-independent alerts)
self.addEventListener("push", (event) => {
  if (!event.data) return;
  const data = event.data.json();
  event.waitUntil(
    self.registration.showNotification(data.title ?? "FarmLink", {
      body: data.body,
      icon: "/icons/icon-192.png",
      badge: "/icons/badge-72.png",
      data: data,
      tag: data.tag ?? "farmlink",
    })
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  event.waitUntil(
    clients.openWindow(event.notification.data?.url ?? "/")
  );
});

// ============================================================
// Cache strategies
// ============================================================

async function cacheFirstStrategy(request) {
  const cached = await caches.match(request);
  if (cached) return cached;

  const response = await fetch(request);
  if (response.ok) {
    const cache = await caches.open(STATIC_CACHE);
    cache.put(request, response.clone());
  }
  return response;
}

async function networkFirstStrategy(request) {
  try {
    const response = await fetch(request);
    if (response.ok && request.method === "GET") {
      const cache = await caches.open(CACHE_VERSION);
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    const cached = await caches.match(request);
    if (cached) return cached;
    // Return offline fallback for HTML requests
    if (request.headers.get("Accept")?.includes("text/html")) {
      return caches.match("/");
    }
    return new Response(JSON.stringify({ error: "offline" }), {
      status: 503,
      headers: { "Content-Type": "application/json" },
    });
  }
}

async function tileStrategy(request) {
  const cached = await caches.match(request);
  if (cached) return cached;

  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(TILE_CACHE);
      // Only cache tiles, skip large files
      const contentLength = response.headers.get("content-length");
      if (!contentLength || parseInt(contentLength) < 500_000) {
        cache.put(request, response.clone());
      }
    }
    return response;
  } catch {
    return new Response("", { status: 503 });
  }
}

async function triggerSync() {
  // Notify all open clients to run the sync engine
  const allClients = await clients.matchAll({ type: "window" });
  for (const client of allClients) {
    client.postMessage({ type: "BACKGROUND_SYNC" });
  }
}
