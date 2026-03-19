import type { Route, LatLng } from "@/lib/types"

// ── Helpers ──────────────────────────────────────────────

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

/** Collect the full ordered path for a route (all segment paths stitched) */
function routePath(route: Route): LatLng[] {
  const points: LatLng[] = []
  for (const seg of route.segments) {
    const segPoints = seg.path.length > 0
      ? seg.path
      : [
          route.waypoints[seg.fromIndex]?.position,
          route.waypoints[seg.toIndex]?.position,
        ].filter(Boolean) as LatLng[]
    // Avoid duplicating the junction point between segments
    for (let i = 0; i < segPoints.length; i++) {
      if (i === 0 && points.length > 0) {
        const last = points[points.length - 1]
        if (last.lat === segPoints[0].lat && last.lng === segPoints[0].lng) continue
      }
      points.push(segPoints[i])
    }
  }
  return points
}

// ── ZIP export (SVGs) ────────────────────────────────────

/**
 * Download all technique SVGs as individual files in a ZIP.
 * Uses dynamic import so JSZip is only loaded when exporting.
 */
export async function exportRouteAsZip(route: Route): Promise<void> {
  if (route.techniqueOutputs.length === 0) return

  const { default: JSZip } = await import("jszip")
  const zip = new JSZip()

  const folder = zip.folder(route.name) ?? zip

  for (const output of route.techniqueOutputs) {
    const filename = `${output.segmentIndex + 1}_${output.label.replace(/[^a-zA-Z0-9-]/g, "_")}.svg`
    folder.file(filename, output.svgContent)
  }

  const blob = await zip.generateAsync({ type: "blob" })
  downloadBlob(blob, `${route.name}.zip`)
}

// ── GPX export ───────────────────────────────────────────

function escapeXml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;")
}

export function exportRouteAsGpx(route: Route): void {
  const path = routePath(route)
  if (path.length === 0) return

  const waypointsXml = route.waypoints
    .filter((w) => !w.ghost)
    .map(
      (wp, i) =>
        `  <wpt lat="${wp.position.lat}" lon="${wp.position.lng}">\n    <name>${escapeXml(wp.label || `Punt ${i + 1}`)}</name>\n  </wpt>`
    )
    .join("\n")

  const trackpoints = path
    .map((p) => `      <trkpt lat="${p.lat}" lon="${p.lng}" />`)
    .join("\n")

  const gpx = `<?xml version="1.0" encoding="UTF-8"?>
<gpx version="1.1" creator="OpenHike"
  xmlns="http://www.topografix.com/GPX/1/1"
  xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
  xsi:schemaLocation="http://www.topografix.com/GPX/1/1 http://www.topografix.com/GPX/1/1/gpx.xsd">
  <metadata>
    <name>${escapeXml(route.name)}</name>
    <time>${new Date().toISOString()}</time>
  </metadata>
${waypointsXml}
  <trk>
    <name>${escapeXml(route.name)}</name>
    <trkseg>
${trackpoints}
    </trkseg>
  </trk>
</gpx>`

  const blob = new Blob([gpx], { type: "application/gpx+xml" })
  downloadBlob(blob, `${route.name}.gpx`)
}

// ── GeoJSON export ───────────────────────────────────────

export function exportRouteAsGeoJson(route: Route): void {
  const path = routePath(route)
  if (path.length === 0) return

  const features: object[] = []

  // Route line
  features.push({
    type: "Feature",
    properties: {
      name: route.name,
      type: "route",
      distance: route.segments.reduce((a, s) => a + s.distance, 0),
      duration: route.segments.reduce((a, s) => a + s.duration, 0),
    },
    geometry: {
      type: "LineString",
      coordinates: path.map((p) => [p.lng, p.lat]),
    },
  })

  // Waypoints
  route.waypoints
    .filter((w) => !w.ghost)
    .forEach((wp, i) => {
      features.push({
        type: "Feature",
        properties: {
          name: wp.label || `Punt ${i + 1}`,
          type: "waypoint",
          index: i,
        },
        geometry: {
          type: "Point",
          coordinates: [wp.position.lng, wp.position.lat],
        },
      })
    })

  const geojson = {
    type: "FeatureCollection",
    features,
  }

  const blob = new Blob([JSON.stringify(geojson, null, 2)], {
    type: "application/geo+json",
  })
  downloadBlob(blob, `${route.name}.geojson`)
}

// ── GPX import ───────────────────────────────────────────

export interface ImportedRoute {
  name: string
  waypoints: LatLng[]
  trackPoints: LatLng[]
}

export function parseGpx(xmlText: string): ImportedRoute {
  const parser = new DOMParser()
  const doc = parser.parseFromString(xmlText, "application/xml")

  const nameEl = doc.querySelector("trk > name") ?? doc.querySelector("metadata > name")
  const name = nameEl?.textContent?.trim() || "Imported route"

  // Track points
  const trackPoints: LatLng[] = []
  doc.querySelectorAll("trkpt").forEach((el) => {
    const lat = parseFloat(el.getAttribute("lat") ?? "")
    const lng = parseFloat(el.getAttribute("lon") ?? "")
    if (!isNaN(lat) && !isNaN(lng)) trackPoints.push({ lat, lng })
  })

  // Route points (if no track)
  if (trackPoints.length === 0) {
    doc.querySelectorAll("rtept").forEach((el) => {
      const lat = parseFloat(el.getAttribute("lat") ?? "")
      const lng = parseFloat(el.getAttribute("lon") ?? "")
      if (!isNaN(lat) && !isNaN(lng)) trackPoints.push({ lat, lng })
    })
  }

  // Waypoints
  const waypoints: LatLng[] = []
  doc.querySelectorAll("gpx > wpt").forEach((el) => {
    const lat = parseFloat(el.getAttribute("lat") ?? "")
    const lng = parseFloat(el.getAttribute("lon") ?? "")
    if (!isNaN(lat) && !isNaN(lng)) waypoints.push({ lat, lng })
  })

  return { name, waypoints: waypoints.length > 0 ? waypoints : simplifyTrack(trackPoints, 10), trackPoints }
}

// ── GeoJSON import ───────────────────────────────────────

export function parseGeoJson(text: string): ImportedRoute {
  const data = JSON.parse(text)
  const features = data.type === "FeatureCollection" ? data.features : [data]

  let name = "Imported route"
  const trackPoints: LatLng[] = []
  const waypoints: LatLng[] = []

  for (const feature of features) {
    if (!feature?.geometry) continue
    const props = feature.properties ?? {}

    if (feature.geometry.type === "LineString") {
      if (props.name) name = props.name
      for (const coord of feature.geometry.coordinates) {
        trackPoints.push({ lat: coord[1], lng: coord[0] })
      }
    } else if (feature.geometry.type === "MultiLineString") {
      if (props.name) name = props.name
      for (const line of feature.geometry.coordinates) {
        for (const coord of line) {
          trackPoints.push({ lat: coord[1], lng: coord[0] })
        }
      }
    } else if (feature.geometry.type === "Point") {
      waypoints.push({ lat: feature.geometry.coordinates[1], lng: feature.geometry.coordinates[0] })
    }
  }

  return { name, waypoints: waypoints.length > 0 ? waypoints : simplifyTrack(trackPoints, 10), trackPoints }
}

/** Simplify a track to roughly `maxPoints` using uniform sampling */
function simplifyTrack(track: LatLng[], maxPoints: number): LatLng[] {
  if (track.length <= maxPoints) return track
  const step = (track.length - 1) / (maxPoints - 1)
  const result: LatLng[] = []
  for (let i = 0; i < maxPoints; i++) {
    result.push(track[Math.round(i * step)])
  }
  return result
}
