"use client"

import { useEffect, useRef } from "react"
import dynamic from "next/dynamic"
import type L from "leaflet"
import { MapControls } from "@/components/map-controls"
import { RouteNotch } from "@/components/route-notch"
import type { ProjectStore } from "@/hooks/use-project-store"
import { fetchSegmentDirections } from "@/lib/directions"
import { Loader2Icon } from "lucide-react"
import { toast } from "sonner"

// Lazy-load the Leaflet map (SSR-incompatible)
const LeafletMap = dynamic(() => import("@/components/leaflet-map"), {
  ssr: false,
  loading: () => (
    <div className="flex size-full items-center justify-center bg-muted">
      <Loader2Icon className="size-6 animate-spin text-muted-foreground" />
    </div>
  ),
})

interface RouteMapProps {
  store: ProjectStore
}

export function RouteMap({ store }: RouteMapProps) {
  const activeRoute = store.activeRoute
  const mapRef = useRef<L.Map | null>(null)

  // Fetch directions per-segment when segments change
  useEffect(() => {
    if (!activeRoute || activeRoute.segments.length === 0) return

    const routeId = activeRoute.id
    const pending = activeRoute.segments.filter((s) => s.path.length === 0)
    if (pending.length === 0) return

    store.setIsLoadingDirections(true)
    let cancelled = false

    async function fetchAll() {
      for (const seg of pending) {
        if (cancelled) break
        const from = activeRoute!.waypoints[seg.fromIndex]?.position
        const to = activeRoute!.waypoints[seg.toIndex]?.position
        if (!from || !to) continue

        const existingPaths = activeRoute!.segments
          .filter((s) => s.id !== seg.id && s.path.length > 0)
          .map((s) => s.path)

        try {
          const data = await fetchSegmentDirections(from, to, existingPaths)
          if (!cancelled) {
            store.setSegmentDirections(routeId, seg.id, data)
          }
        } catch {
          toast.error("Route kon niet worden berekend", {
            description:
              "Controleer of de punten bereikbaar zijn via wandelpaden.",
          })
        }
      }
      if (!cancelled) {
        store.setIsLoadingDirections(false)
      }
    }

    fetchAll()
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    activeRoute?.segments.length,
    activeRoute?.waypoints.length,
    // Re-trigger when segments become pending after a waypoint drag
    activeRoute?.segments
      .filter((s) => s.path.length === 0)
      .map((s) => s.id)
      .join(),
  ])

  return (
    <>
      <LeafletMap store={store} mapRef={mapRef} />

      <MapControls mapRef={mapRef} />
      <RouteNotch store={store} />

      {store.isLoadingDirections && (
        <div className="absolute top-4 left-1/2 z-10 -translate-x-1/2">
          <div className="flex items-center gap-2 rounded-full bg-background/90 px-4 py-2 text-sm shadow-lg backdrop-blur">
            <Loader2Icon className="size-4 animate-spin" />
            Route berekenen...
          </div>
        </div>
      )}
    </>
  )
}
