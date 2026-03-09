import type { LatLng, Intersection } from "@/lib/types"
import { bearing, haversine } from "@/lib/geo"
import { enrichIntersections } from "@/lib/enrich"

// ── Overlap scoring ──────────────────────────────────────
/** Count how many points in `path` are within `threshold` meters of any point in `existing` */
function overlapCount(
  path: LatLng[],
  existing: LatLng[],
  threshold = 30
): number {
  if (existing.length === 0) return 0
  // Sample existing for performance (every 3rd point)
  const sampled = existing.filter((_, i) => i % 3 === 0)
  let count = 0
  for (const p of path) {
    for (const e of sampled) {
      if (haversine(p.lat, p.lng, e.lat, e.lng) < threshold) {
        count++
        break
      }
    }
  }
  return count
}

/** Convert GeoJSON [lng, lat] coordinates to LatLng[] */
function geoJsonToPath(coords: number[][]): LatLng[] {
  return coords.map(([lng, lat]) => ({ lat, lng }))
}

// ── Fetch directions for a single segment ────────────────
export interface SegmentDirectionsResult {
  path: LatLng[]
  intersections: Intersection[]
  legDistances: number[]
  legBearings: number[]
  distance: number
  duration: number
}

/**
 * Fetch walking directions between two points via OpenRouteService.
 * When `existingPaths` is provided, picks the alternative route with least overlap.
 */
export async function fetchSegmentDirections(
  from: LatLng,
  to: LatLng,
  existingPaths: LatLng[][] = []
): Promise<SegmentDirectionsResult> {
  const res = await fetch("/api/directions", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      coordinates: [
        [from.lng, from.lat],
        [to.lng, to.lat],
      ],
    }),
  })

  const data = await res.json()

  if (data.error || !data.features?.length) {
    throw new Error(`Directions API error: ${data.error ?? "no routes found"}`)
  }

  // Flatten existing paths for overlap checking
  const allExisting = existingPaths.flat()

  // Pick best route (least overlap with existing segments)
  let bestIdx = 0
  if (data.features.length > 1 && allExisting.length > 0) {
    let bestScore = Infinity
    for (let i = 0; i < data.features.length; i++) {
      const candidatePath = geoJsonToPath(data.features[i].geometry.coordinates)
      const score = overlapCount(candidatePath, allExisting)
      if (score < bestScore) {
        bestScore = score
        bestIdx = i
      }
    }
  }

  const feature = data.features[bestIdx]
  const path = geoJsonToPath(feature.geometry.coordinates)
  const summary = feature.properties.summary

  // Extract basic intersections from ORS steps (used as fallback)
  const orsIntersections: Intersection[] = []

  for (const segment of feature.properties.segments) {
    for (const step of segment.steps) {
      // ORS step types: 0=left, 1=right, 2=sharp left, 3=sharp right,
      // 4=slight left, 5=slight right, 6=straight, 10=depart, 11=arrive
      if (step.type === 6 || step.type === 10 || step.type === 11) continue

      const coordIdx = step.way_points[0]
      const coords = feature.geometry.coordinates[coordIdx]
      if (!coords) continue

      const pos: LatLng = { lat: coords[1], lng: coords[0] }
      const nextIdx = step.way_points[1] ?? coordIdx + 1
      const nextCoords = feature.geometry.coordinates[nextIdx]
      let routeBearing = 0
      if (nextCoords) {
        routeBearing = bearing(pos.lat, pos.lng, nextCoords[1], nextCoords[0])
      }

      orsIntersections.push({
        position: pos,
        bearing: routeBearing,
        sideStreets: [],
        streetName: step.name || undefined,
      })
    }
  }

  // Enrich with Overpass data: detect all junctions + side streets along the path
  const enriched = await enrichIntersections(path, orsIntersections)

  return {
    path,
    intersections: enriched.intersections,
    legDistances: enriched.legDistances,
    legBearings: enriched.legBearings,
    distance: summary.distance, // meters
    duration: summary.duration, // seconds
  }
}
