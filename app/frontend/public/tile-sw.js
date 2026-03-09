const CACHE_NAME = "map-tiles-v2"
const MAX_ENTRIES = 2000

self.addEventListener("install", () => self.skipWaiting())
self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))
        )
      )
      .then(() => self.clients.claim())
  )
})

self.addEventListener("fetch", (e) => {
  const url = e.request.url
  // Only cache map tile requests
  if (
    !url.includes("basemaps.cartocdn.com") &&
    !url.includes("tile.openstreetmap.org")
  )
    return

  e.respondWith(
    caches.open(CACHE_NAME).then(async (cache) => {
      const cached = await cache.match(e.request)
      if (cached) return cached

      const res = await fetch(e.request)
      if (res.ok) {
        // Evict oldest entries if cache is full
        const keys = await cache.keys()
        if (keys.length > MAX_ENTRIES) {
          await cache.delete(keys[0])
        }
        cache.put(e.request, res.clone())
      }
      return res
    })
  )
})
