"use client"

import { useEffect, useRef } from "react"
import L from "leaflet"
import { useMap } from "react-leaflet"
import type { ProjectStore } from "@/hooks/use-project-store"
import { TECHNIQUE_COLORS } from "@/lib/types"
import { toast } from "sonner"

export function RouteDragHandler({ store }: { store: ProjectStore }) {
  const map = useMap()
  const hitLinesRef = useRef<L.Polyline[]>([])
  const ghostRef = useRef<L.Marker | null>(null)
  const dragSegRef = useRef<string | null>(null)

  const project = store.activeProject
  const route = project?.routes.find((r) => r.id === store.activeRouteId)

  useEffect(() => {
    hitLinesRef.current.forEach((l) => l.remove())
    hitLinesRef.current = []

    if (!route) return

    for (const seg of route.segments) {
      if (seg.path.length < 2) continue
      const latlngs: L.LatLngExpression[] = seg.path.map((p) => [p.lat, p.lng])
      const segColor = TECHNIQUE_COLORS[seg.technique]

      // Ghost icon matches route line color and weight
      const ghostIcon = L.divIcon({
        className: "",
        iconSize: [12, 12],
        iconAnchor: [6, 6],
        html: `<div style="width:12px;height:12px;border-radius:50%;background:${segColor};opacity:0.9;box-shadow:0 1px 4px rgba(0,0,0,.3)"></div>`,
      })

      const hitLine = L.polyline(latlngs, {
        weight: 36,
        opacity: 0,
        interactive: true,
      }).addTo(map)

      ;(hitLine.getElement() as HTMLElement | undefined)?.style.setProperty(
        "cursor",
        "grab"
      )

      const segId = seg.id

      hitLine.on("mousedown", (e: L.LeafletMouseEvent) => {
        L.DomEvent.stopPropagation(e)
        map.dragging.disable()
        dragSegRef.current = segId

        ghostRef.current = L.marker(e.latlng, {
          icon: ghostIcon,
          interactive: false,
          zIndexOffset: 2000,
        }).addTo(map)

        const onMove = (ev: L.LeafletMouseEvent) => {
          ghostRef.current?.setLatLng(ev.latlng)
        }

        const onUp = (ev: L.LeafletMouseEvent) => {
          map.off("mousemove", onMove)
          map.off("mouseup", onUp)
          map.dragging.enable()

          ghostRef.current?.remove()
          ghostRef.current = null

          if (dragSegRef.current) {
            store.insertWaypoint(dragSegRef.current, {
              lat: ev.latlng.lat,
              lng: ev.latlng.lng,
            })
            dragSegRef.current = null
            toast.success("Route omgeleid", {
              description: "Klik op het punt om het te verwijderen.",
            })
          }
        }

        map.on("mousemove", onMove)
        map.on("mouseup", onUp)
      })

      hitLinesRef.current.push(hitLine)
    }

    return () => {
      hitLinesRef.current.forEach((l) => l.remove())
      hitLinesRef.current = []
      ghostRef.current?.remove()
      ghostRef.current = null
    }
  }, [map, route, store])

  return null
}
