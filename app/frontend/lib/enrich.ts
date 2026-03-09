import type { LatLng, Intersection, SideStreet } from "@/lib/types"
import { bearing, haversine } from "@/lib/geo"

// ── OSRM response types ─────────────────────────────────

interface OsrmIntersection {
  location: [number, number] // [lng, lat]
  bearings: number[]
  entry: boolean[]
  in?: number // index into bearings for approach direction
  out?: number // index into bearings for exit direction
}

interface OsrmStep {
  intersections: OsrmIntersection[]
  name: string
  distance: number
  duration: number
}

interface OsrmLeg {
  steps: OsrmStep[]
}

interface OsrmRoute {
  geometry: { type: string; coordinates: number[][] }
  legs: OsrmLeg[]
  distance: number
  duration: number
}

interface OsrmResponse {
  code: string
  routes?: OsrmRoute[]
}

// ── Main enrichment function ─────────────────────────────

/**
 * Query OSRM for a walking route between the same endpoints,
 * then extract intersection data with side streets already classified.
 *
 * OSRM natively provides bearings + in/out indices at each intersection,
 * so every bearing that isn't the approach or exit is a side street.
 * No manual graph building or angle math needed.
 */
export async function enrichIntersections(
  path: LatLng[],
  osFallbackIntersections: Intersection[]
): Promise<{
  intersections: Intersection[]
  legDistances: number[]
  legBearings: number[]
}> {
  const start = path[0]
  const end = path[path.length - 1]
  console.log(
    "[OSRM] enrichIntersections called, path length:",
    path.length,
    "from:",
    [start.lat.toFixed(5), start.lng.toFixed(5)],
    "to:",
    [end.lat.toFixed(5), end.lng.toFixed(5)]
  )

  try {
    const data = await fetchOsrm(start, end)

    if (data.code !== "Ok" || !data.routes?.length) {
      console.warn("[OSRM] No route found, using ORS fallback")
      return fallbackWithStartEnd(path, osFallbackIntersections)
    }

    const result = processOsrmData(data.routes[0], path)
    console.log("[OSRM] Enriched result:", {
      intersections: result.intersections.length,
      withSideStreets: result.intersections.filter(
        (ix) => ix.sideStreets.length > 0
      ).length,
      sideStreetCounts: result.intersections.map(
        (ix, i) =>
          `#${i}: ${ix.sideStreets.length} side streets (bearing: ${ix.bearing}°)`
      ),
    })
    return result
  } catch (err) {
    console.warn("[OSRM] Enrichment failed, using ORS fallback:", err)
    return fallbackWithStartEnd(path, osFallbackIntersections)
  }
}

// ── Fetch ────────────────────────────────────────────────

async function fetchOsrm(from: LatLng, to: LatLng): Promise<OsrmResponse> {
  const res = await fetch("/api/osrm", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      from: [from.lat, from.lng],
      to: [to.lat, to.lng],
    }),
  })
  if (!res.ok) throw new Error(`OSRM HTTP ${res.status}`)
  return res.json()
}

// ── Process OSRM data ────────────────────────────────────

function processOsrmData(
  route: OsrmRoute,
  originalPath: LatLng[]
): {
  intersections: Intersection[]
  legDistances: number[]
  legBearings: number[]
} {
  const start = originalPath[0]
  const end = originalPath[originalPath.length - 1]

  // Collect all intersections from OSRM that have side streets
  // (i.e., 3+ bearings → at least 1 bearing besides approach + exit)
  const junctions: {
    position: LatLng
    exitBearing: number
    sideStreets: SideStreet[]
    streetName?: string
  }[] = []

  for (const leg of route.legs) {
    for (const step of leg.steps) {
      for (const ix of step.intersections) {
        // Need at least 3 road connections for there to be a side street
        if (ix.bearings.length < 3) continue

        // Everything that isn't approach (in) or exit (out) is a side street
        const sideStreets: SideStreet[] = []
        for (let bi = 0; bi < ix.bearings.length; bi++) {
          if (bi === ix.in || bi === ix.out) continue
          sideStreets.push({ bearing: ix.bearings[bi] })
        }

        if (sideStreets.length === 0) continue

        const pos: LatLng = { lat: ix.location[1], lng: ix.location[0] }
        const exitBearing = ix.out !== undefined ? ix.bearings[ix.out] : 0

        junctions.push({
          position: pos,
          exitBearing,
          sideStreets,
          streetName: step.name || undefined,
        })
      }
    }
  }

  console.log(
    "[OSRM] Found",
    junctions.length,
    "junctions with side streets from OSRM route data"
  )

  // Deduplicate junctions within 10m of each other
  const deduped: typeof junctions = []
  for (const j of junctions) {
    if (
      deduped.length > 0 &&
      haversine(
        deduped[deduped.length - 1].position.lat,
        deduped[deduped.length - 1].position.lng,
        j.position.lat,
        j.position.lng
      ) < 10
    ) {
      // Keep the one with more side streets
      if (
        j.sideStreets.length >
        deduped[deduped.length - 1].sideStreets.length
      ) {
        deduped[deduped.length - 1] = j
      }
      continue
    }
    deduped.push(j)
  }

  // Build Intersection[]: start + junctions + end
  const intersections: Intersection[] = []

  // Start point
  const startBearing =
    deduped.length > 0
      ? bearing(
          start.lat,
          start.lng,
          deduped[0].position.lat,
          deduped[0].position.lng
        )
      : bearing(start.lat, start.lng, end.lat, end.lng)
  intersections.push({
    position: start,
    bearing: Math.round(startBearing),
    sideStreets: [],
  })

  // Junction points
  for (const j of deduped) {
    intersections.push({
      position: j.position,
      bearing: Math.round(j.exitBearing),
      sideStreets: j.sideStreets,
      streetName: j.streetName,
    })
  }

  // End point
  intersections.push({
    position: end,
    bearing: 0,
    sideStreets: [],
  })

  // Remove start/end if essentially the same as an adjacent junction (< 15m)
  if (
    intersections.length > 2 &&
    haversine(
      intersections[0].position.lat,
      intersections[0].position.lng,
      intersections[1].position.lat,
      intersections[1].position.lng
    ) < 15
  ) {
    intersections.shift()
  }
  if (
    intersections.length > 2 &&
    haversine(
      intersections[intersections.length - 1].position.lat,
      intersections[intersections.length - 1].position.lng,
      intersections[intersections.length - 2].position.lat,
      intersections[intersections.length - 2].position.lng
    ) < 15
  ) {
    intersections.pop()
  }

  // Compute leg distances & bearings
  const legDistances: number[] = []
  const legBearings: number[] = []
  for (let i = 0; i < intersections.length - 1; i++) {
    const a = intersections[i].position
    const b = intersections[i + 1].position
    legDistances.push(Math.round(haversine(a.lat, a.lng, b.lat, b.lng)))
    legBearings.push(Math.round(bearing(a.lat, a.lng, b.lat, b.lng)))
  }

  return { intersections, legDistances, legBearings }
}

// ── Fallback (when OSRM fails) ──────────────────────────

function fallbackWithStartEnd(
  path: LatLng[],
  orsIntersections: Intersection[]
): {
  intersections: Intersection[]
  legDistances: number[]
  legBearings: number[]
} {
  const start = path[0]
  const end = path[path.length - 1]
  const intersections = [...orsIntersections]

  // Prepend start if far enough from first intersection
  if (
    intersections.length === 0 ||
    haversine(
      start.lat,
      start.lng,
      intersections[0].position.lat,
      intersections[0].position.lng
    ) > 15
  ) {
    const b =
      intersections.length > 0
        ? bearing(
            start.lat,
            start.lng,
            intersections[0].position.lat,
            intersections[0].position.lng
          )
        : bearing(start.lat, start.lng, end.lat, end.lng)
    intersections.unshift({
      position: start,
      bearing: Math.round(b),
      sideStreets: [],
    })
  }

  // Append end if far enough from last intersection
  if (
    haversine(
      end.lat,
      end.lng,
      intersections[intersections.length - 1].position.lat,
      intersections[intersections.length - 1].position.lng
    ) > 15
  ) {
    intersections.push({
      position: end,
      bearing: 0,
      sideStreets: [],
    })
  }

  const legDistances: number[] = []
  const legBearings: number[] = []
  for (let i = 0; i < intersections.length - 1; i++) {
    const a = intersections[i].position
    const b = intersections[i + 1].position
    legDistances.push(Math.round(haversine(a.lat, a.lng, b.lat, b.lng)))
    legBearings.push(Math.round(bearing(a.lat, a.lng, b.lat, b.lng)))
  }

  return { intersections, legDistances, legBearings }
}
