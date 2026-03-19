"use client"

import { useEffect, useRef } from "react"
import L from "leaflet"
import { useMap, useMapEvents } from "react-leaflet"
import type { LatLng, Segment } from "@/lib/types"
import { TECHNIQUE_COLORS } from "@/lib/types"
import { formatSegmentDuration, formatSegmentDistance } from "@/lib/format"
import type { ProjectStore } from "@/hooks/use-project-store"

function createBadgeIcon(time: string, dist: string, color: string): L.DivIcon {
  const dot =
    time && dist
      ? `<span style="width:5px;height:5px;border-radius:50%;background:${color};display:inline-block"></span>`
      : ""
  return L.divIcon({
    className: "",
    iconAnchor: [0, 0],
    html: `<div style="display:inline-flex;align-items:center;gap:5px;background:#fff;border:1.5px solid ${color};border-radius:9999px;padding:2px 8px;font-size:11px;font-weight:600;white-space:nowrap;color:#333;box-shadow:0 1px 3px rgba(0,0,0,.1);transform:translate(-50%,-50%)">${time ? `<span>${time}</span>` : ""}${dot}<span>${dist}</span></div>`,
  })
}

export function SegmentBadges({ store }: { store: ProjectStore }) {
  const map = useMap()
  const project = store.activeProject
  const badgesRef = useRef<L.Marker[]>([])

  useEffect(() => {
    badgesRef.current.forEach((m) => m.remove())
    badgesRef.current = []

    if (!project) return

    const MIN_PX_DIST = 70
    const placedPixels: { x: number; y: number }[] = []

    function toPixel(pos: LatLng): { x: number; y: number } | null {
      const px = map.latLngToContainerPoint([pos.lat, pos.lng])
      return { x: px.x, y: px.y }
    }

    function tooClose(px: { x: number; y: number }): boolean {
      return placedPixels.some(
        (p) => Math.hypot(p.x - px.x, p.y - px.y) < MIN_PX_DIST
      )
    }

    for (const r of project.routes) {
      const isActive = r.id === store.activeRouteId
      if (!isActive) continue

      const groups: { segments: Segment[]; technique: Segment["technique"] }[] =
        []
      for (const seg of r.segments) {
        if (groups.length === 0 || !r.waypoints[seg.fromIndex]?.ghost) {
          groups.push({ segments: [seg], technique: seg.technique })
        } else {
          groups[groups.length - 1].segments.push(seg)
        }
      }

      for (const group of groups) {
        const totalDist = group.segments.reduce((a, s) => a + s.distance, 0)
        const totalDur = group.segments.reduce((a, s) => a + s.duration, 0)
        const allPaths = group.segments.flatMap((s) => s.path)
        if (allPaths.length < 2 || totalDist <= 0) continue

        const color = TECHNIQUE_COLORS[group.technique]
        const fakeSeg = { distance: totalDist, duration: totalDur } as Segment
        const time = formatSegmentDuration(fakeSeg)
        const dist = formatSegmentDistance(fakeSeg)
        if (!time && !dist) continue

        const fractions = [0.5, 0.33, 0.67, 0.25, 0.75, 0.1, 0.9]
        let chosenPos = allPaths[Math.floor(allPaths.length / 2)]
        let placed = false

        for (const frac of fractions) {
          const idx = Math.min(
            Math.floor(allPaths.length * frac),
            allPaths.length - 1
          )
          const candidate = allPaths[idx]
          const px = toPixel(candidate)
          if (px && !tooClose(px)) {
            chosenPos = candidate
            placedPixels.push(px)
            placed = true
            break
          }
        }
        if (!placed) {
          const px = toPixel(chosenPos)
          if (px) placedPixels.push(px)
        }

        const icon = createBadgeIcon(time, dist, color)
        const marker = L.marker([chosenPos.lat, chosenPos.lng], {
          icon,
          interactive: false,
          zIndexOffset: 1000,
        }).addTo(map)
        badgesRef.current.push(marker)
      }
    }

    return () => {
      badgesRef.current.forEach((m) => m.remove())
      badgesRef.current = []
    }
  }, [map, project, store.activeRouteId])

  useMapEvents({
    zoomend: () => {},
  })

  return null
}
