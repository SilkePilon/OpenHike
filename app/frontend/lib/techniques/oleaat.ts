import type { Segment } from "@/lib/types"
import { svgWrap } from "./helpers"

export function generate(segment: Segment): string {
  const { path } = segment
  if (path.length < 2)
    return svgWrap(
      200,
      60,
      '<text x="10" y="30" font-size="14" fill="#666">Geen route</text>'
    )

  const padding = 30
  const size = 400
  const minLat = Math.min(...path.map((p) => p.lat))
  const maxLat = Math.max(...path.map((p) => p.lat))
  const minLng = Math.min(...path.map((p) => p.lng))
  const maxLng = Math.max(...path.map((p) => p.lng))
  const latRange = maxLat - minLat || 0.001
  const lngRange = maxLng - minLng || 0.001

  const toX = (lng: number) =>
    padding + ((lng - minLng) / lngRange) * (size - padding * 2)
  const toY = (lat: number) =>
    padding + ((maxLat - lat) / latRange) * (size - padding * 2)

  const points = path
    .map((p) => `${toX(p.lng).toFixed(1)},${toY(p.lat).toFixed(1)}`)
    .join(" ")
  let inner = `<polyline points="${points}" fill="none" stroke="#333" stroke-width="2.5" stroke-linejoin="round" stroke-linecap="round"/>`

  // Start/end markers
  const s = path[0]
  const e = path[path.length - 1]
  inner += `<circle cx="${toX(s.lng)}" cy="${toY(s.lat)}" r="5" fill="#16a34a"/>`
  inner += `<circle cx="${toX(e.lng)}" cy="${toY(e.lat)}" r="5" fill="#e53e3e"/>`
  inner += `<text x="${toX(s.lng) + 8}" y="${toY(s.lat) + 4}" font-size="10" fill="#16a34a">Start</text>`
  inner += `<text x="${toX(e.lng) + 8}" y="${toY(e.lat) + 4}" font-size="10" fill="#e53e3e">Eind</text>`

  return svgWrap(size, size, inner)
}
