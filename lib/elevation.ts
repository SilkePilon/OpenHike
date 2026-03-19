import type { LatLng, Route, TechniqueType } from "@/lib/types"
import { TECHNIQUE_COLORS } from "@/lib/types"
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

/** Boundary between segments expressed as a fraction of total distance */
export interface SegmentColorStop {
  /** 0‑1 fraction of total route distance where this segment starts */
  offset: number
  color: string
}

export interface ElevationProfileData {
  points: ElevationPoint[]
  stats: ElevationStats | null
  /** Color stops derived from segment technique colors */
  colorStops: SegmentColorStop[]
}

/** Fetch real elevation values from Open‑Meteo via our API proxy */
export async function fetchElevations(coords: LatLng[]): Promise<number[]> {
  if (coords.length === 0) return []
  const res = await fetch("/api/elevation", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      coordinates: coords.map((c) => [c.lat, c.lng]),
    }),
  })
  if (!res.ok) return coords.map(() => 0)
  const data = await res.json()
  return data.elevations ?? coords.map(() => 0)
}

/** Interpolate N equally-spaced points between two coords */
export function interpolatePoints(a: LatLng, b: LatLng, n: number): LatLng[] {
  const pts: LatLng[] = []
  for (let i = 0; i <= n; i++) {
    const t = i / n
    pts.push({
      lat: a.lat + (b.lat - a.lat) * t,
      lng: a.lng + (b.lng - a.lng) * t,
    })
  }
  return pts
}

/** Compute elevation stats from a list of points */
function computeStats(points: ElevationPoint[]): ElevationStats | null {
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

  return {
    ascent: Math.round(ascent),
    descent: Math.round(descent),
    minElevation: Math.round(min),
    maxElevation: Math.round(max),
  }
}

/** Build the full elevation profile + per-segment color stops */
export function getRouteElevationProfile(route: Route): ElevationProfileData {
  const points: ElevationPoint[] = []
  const segDistances: {
    technique: TechniqueType
    startDist: number
    endDist: number
  }[] = []
  let cumulativeDistance = 0

  for (const seg of route.segments) {
    if (!seg.elevation || seg.elevation.length === 0 || seg.path.length === 0)
      continue

    const segStart = cumulativeDistance

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

    segDistances.push({
      technique: seg.technique,
      startDist: segStart,
      endDist: cumulativeDistance,
    })
  }

  const totalDist = points.length > 0 ? points[points.length - 1].distance : 1

  // Build hard-cutoff color stops: two stops at each boundary so colors don't blend
  const colorStops: SegmentColorStop[] = []
  for (let i = 0; i < segDistances.length; i++) {
    const sd = segDistances[i]
    const color = TECHNIQUE_COLORS[sd.technique]
    colorStops.push({ offset: sd.startDist / totalDist, color })
    colorStops.push({ offset: sd.endDist / totalDist, color })
  }

  return { points, stats: computeStats(points), colorStops }
}
