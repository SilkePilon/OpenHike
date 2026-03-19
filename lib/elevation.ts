import type { Route } from "@/lib/types"
import { haversine } from "@/lib/geo"

export interface ElevationStats {
  ascent: number
  descent: number
  minElevation: number
  maxElevation: number
}

export interface ElevationPoint {
  distance: number // cumulative distance in meters from route start
  elevation: number // meters
}

/** Compute elevation stats for an entire route */
export function computeElevationStats(route: Route): ElevationStats | null {
  const points = getRouteElevationProfile(route)
  if (points.length === 0) return null

  let ascent = 0
  let descent = 0
  let min = points[0].elevation
  let max = points[0].elevation

  for (let i = 1; i < points.length; i++) {
    const diff = points[i].elevation - points[i - 1].elevation
    if (diff > 0) ascent += diff
    else descent += Math.abs(diff)
    if (points[i].elevation < min) min = points[i].elevation
    if (points[i].elevation > max) max = points[i].elevation
  }

  return { ascent: Math.round(ascent), descent: Math.round(descent), minElevation: Math.round(min), maxElevation: Math.round(max) }
}

/** Get full elevation profile (distance vs elevation) for drawing a chart */
export function getRouteElevationProfile(route: Route): ElevationPoint[] {
  const points: ElevationPoint[] = []
  let cumulativeDistance = 0

  for (const seg of route.segments) {
    if (!seg.elevation || seg.elevation.length === 0 || seg.path.length === 0) continue

    for (let i = 0; i < seg.path.length; i++) {
      // Skip duplicate junction point between segments
      if (i === 0 && points.length > 0) {
        const last = points[points.length - 1]
        const p = seg.path[0]
        const prevSeg = route.segments[route.segments.indexOf(seg) - 1]
        if (prevSeg?.path.length) {
          const prevLast = prevSeg.path[prevSeg.path.length - 1]
          if (prevLast.lat === p.lat && prevLast.lng === p.lng) continue
        }
        // If elevation matches closely, skip as junction
        if (Math.abs(last.elevation - (seg.elevation[0] ?? 0)) < 0.1) {
          cumulativeDistance = last.distance
        }
      }

      if (i > 0) {
        cumulativeDistance += haversine(
          seg.path[i - 1].lat,
          seg.path[i - 1].lng,
          seg.path[i].lat,
          seg.path[i].lng
        )
      }

      points.push({
        distance: cumulativeDistance,
        elevation: seg.elevation[i] ?? 0,
      })
    }
  }

  return points
}
