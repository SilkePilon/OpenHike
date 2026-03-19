const TILE_CACHE = "map-tiles-v2"
const APP_CACHE = "app-shell-v1"
const API_CACHE = "api-cache-v1"
const MAX_TILE_ENTRIES = 2000
const MAX_API_ENTRIES = 200

/** URLs to pre-cache for the app shell (offline access) */
const APP_SHELL = ["/", "/manifest.json"]

self.addEventListener("install", (e) => {
  e.waitUntil(
    caches
      .open(APP_CACHE)
      .then((cache) => cache.addAll(APP_SHELL))
      .then(() => self.skipWaiting())
  )
})

self.addEventListener("activate", (e) => {
  const allowed = new Set([TILE_CACHE, APP_CACHE, API_CACHE])
  e.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((k) => !allowed.has(k)).map((k) => caches.delete(k)))
      )
      .then(() => self.clients.claim())
  )
})

/** Cache-first fetch for a given cache name with entry limit */
async function cacheFirst(request, cacheName, maxEntries) {
  const cache = await caches.open(cacheName)
  const cached = await cache.match(request)
  if (cached) return cached
  const res = await fetch(request)
  if (res.ok) {
    const keys = await cache.keys()
    if (keys.length > maxEntries) await cache.delete(keys[0])
    cache.put(request, res.clone())
  }
  return res
}

/** Network-first fetch — falls back to cache when offline */
async function networkFirst(request, cacheName) {
  const cache = await caches.open(cacheName)
  try {
    const res = await fetch(request)
    if (res.ok) cache.put(request, res.clone())
    return res
  } catch {
    const cached = await cache.match(request)
    if (cached) return cached
    return new Response(JSON.stringify({ error: "offline" }), {
      status: 503,
      headers: { "Content-Type": "application/json" },
    })
  }
}

self.addEventListener("fetch", (e) => {
  const url = e.request.url

  // Map tiles → cache-first
  if (
    url.includes("basemaps.cartocdn.com") ||
    url.includes("tile.openstreetmap.org")
  ) {
    e.respondWith(cacheFirst(e.request, TILE_CACHE, MAX_TILE_ENTRIES))
    return
  }

  // API routes → network-first (available offline if previously cached)
  if (url.includes("/api/")) {
    e.respondWith(networkFirst(e.request.clone(), API_CACHE))
    return
  }

  // App navigation → network-first with app shell fallback
  if (e.request.mode === "navigate") {
    e.respondWith(
      fetch(e.request).catch(() => caches.match("/").then((r) => r || fetch(e.request)))
    )
    return
  }
})
