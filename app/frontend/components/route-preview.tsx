"use client"

import type { Route } from "@/lib/types"
import { TECHNIQUE_COLORS } from "@/lib/types"

interface RoutePreviewProps {
  route: Route
  width?: number
  height?: number
  className?: string
}

export function RoutePreview({
  route,
  width = 200,
  height = 80,
  className,
}: RoutePreviewProps) {
  const waypoints = route.waypoints
  if (waypoints.length === 0) return null

  // Collect all points (waypoints + segment paths)
  const allPoints = waypoints.map((wp) => wp.position)
  route.segments.forEach((seg) => {
    seg.path.forEach((p) => allPoints.push(p))
  })

  const lats = allPoints.map((p) => p.lat)
  const lngs = allPoints.map((p) => p.lng)
  const minLat = Math.min(...lats)
  const maxLat = Math.max(...lats)
  const minLng = Math.min(...lngs)
  const maxLng = Math.max(...lngs)

  const padding = 12
  const innerW = width - padding * 2
  const innerH = height - padding * 2

  const rangeX = maxLng - minLng || 0.001
  const rangeY = maxLat - minLat || 0.001
  const scale = Math.min(innerW / rangeX, innerH / rangeY)

  function toSvg(p: { lat: number; lng: number }): [number, number] {
    const x = padding + (p.lng - minLng) * scale + (innerW - rangeX * scale) / 2
    const y = padding + (maxLat - p.lat) * scale + (innerH - rangeY * scale) / 2
    return [x, y]
  }

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      className={className}
    >
      {/* Segment polylines */}
      {route.segments.map((seg) => {
        const points =
          seg.path.length > 0
            ? seg.path
            : [
                waypoints[seg.fromIndex]?.position,
                waypoints[seg.toIndex]?.position,
              ].filter(Boolean)
        if (points.length < 2) return null
        const d = points
          .map((p, i) => {
            const [x, y] = toSvg(p)
            return `${i === 0 ? "M" : "L"}${x},${y}`
          })
          .join(" ")
        return (
          <path
            key={seg.id}
            d={d}
            fill="none"
            stroke={TECHNIQUE_COLORS[seg.technique]}
            strokeWidth={2.5}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        )
      })}
      {/* Waypoint dots */}
      {waypoints.map((wp) => {
        const [x, y] = toSvg(wp.position)
        return (
          <circle
            key={wp.id}
            cx={x}
            cy={y}
            r={3}
            fill={route.color}
            stroke="white"
            strokeWidth={1.5}
          />
        )
      })}
    </svg>
  )
}
