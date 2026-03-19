"use client"

import { useEffect } from "react"
import L from "leaflet"
import { useMap } from "react-leaflet"
import type { ProjectStore } from "@/hooks/use-project-store"

export function FitBounds({ store }: { store: ProjectStore }) {
  const map = useMap()
  const project = store.activeProject

  useEffect(() => {
    if (!store.activeRouteId) return
    const route = project?.routes.find((r) => r.id === store.activeRouteId)
    if (!route || route.waypoints.length === 0) return

    const points: L.LatLngExpression[] = []
    route.waypoints.forEach((wp) =>
      points.push([wp.position.lat, wp.position.lng])
    )
    route.segments.forEach((seg) =>
      seg.path.forEach((p) => points.push([p.lat, p.lng]))
    )

    if (points.length > 0) {
      const bounds = L.latLngBounds(points)
      map.fitBounds(bounds, { padding: [50, 50] })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map, store.activeRouteId])

  return null
}
