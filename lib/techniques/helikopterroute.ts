import type { Segment } from "@/lib/types"
import { svgWrap, arrowHead } from "./helpers"
import { bearing, haversine } from "@/lib/geo"

export function generate(segment: Segment): string {
  const { intersections } = segment
  if (intersections.length < 2)
    return svgWrap(
      200,
      60,
      '<text x="10" y="30" font-size="14" fill="#666">Te weinig punten</text>'
    )

  const origin = intersections[0].position
  const size = 400
  const cx = size / 2
  const cy = size / 2
  const maxRadius = size / 2 - 60

  // Calculate bearings & distances from origin
  const arrows: { b: number; d: number; idx: number }[] = []
  let maxDist = 0
  for (let i = 1; i < intersections.length; i++) {
    const pos = intersections[i].position
    const b = bearing(origin.lat, origin.lng, pos.lat, pos.lng)
    const d = haversine(origin.lat, origin.lng, pos.lat, pos.lng)
    arrows.push({ b, d, idx: i })
    if (d > maxDist) maxDist = d
  }

  const scale = maxDist > 0 ? maxRadius / maxDist : 1

  let inner = ""

  // North arrow (thick, prominent)
  const northLen = maxRadius + 20
  inner += `<line x1="${cx}" y1="${cy}" x2="${cx}" y2="${cy - northLen}" stroke="#333" stroke-width="3"/>`
  inner += arrowHead(cx, cy - northLen, -90, 12, "#333")
  inner += `<text x="${cx}" y="${cy - northLen - 10}" text-anchor="middle" font-size="14" font-weight="bold" fill="#333">N</text>`

  // Route arrows from center
  arrows.forEach((a) => {
    const len = a.d * scale
    const rad = (a.b * Math.PI) / 180
    const ex = cx + len * Math.sin(rad)
    const ey = cy - len * Math.cos(rad)

    inner += `<line x1="${cx}" y1="${cy}" x2="${ex}" y2="${ey}" stroke="#e53e3e" stroke-width="2"/>`

    const angle = (Math.atan2(ey - cy, ex - cx) * 180) / Math.PI
    inner += arrowHead(ex, ey, angle, 10, "#e53e3e")

    // Number label beyond arrow tip
    const labelX = cx + (len + 16) * Math.sin(rad)
    const labelY = cy - (len + 16) * Math.cos(rad)
    inner += `<text x="${labelX}" y="${labelY + 4}" text-anchor="middle" font-size="11" font-weight="bold" fill="#333">${a.idx + 1}</text>`
  })

  // Center dot (point 1)
  inner += `<circle cx="${cx}" cy="${cy}" r="5" fill="#333"/>`
  inner += `<text x="${cx + 10}" y="${cy - 10}" font-size="10" fill="#333">1</text>`

  // Scale legend
  const scaleDist = Math.round(maxDist / 2) || 1
  const scaleLen = scaleDist * scale
  const scaleY = size - 25
  inner += `<line x1="20" y1="${scaleY}" x2="${20 + scaleLen}" y2="${scaleY}" stroke="#666" stroke-width="1.5"/>`
  inner += `<line x1="20" y1="${scaleY - 4}" x2="20" y2="${scaleY + 4}" stroke="#666" stroke-width="1.5"/>`
  inner += `<line x1="${20 + scaleLen}" y1="${scaleY - 4}" x2="${20 + scaleLen}" y2="${scaleY + 4}" stroke="#666" stroke-width="1.5"/>`
  inner += `<text x="${20 + scaleLen / 2}" y="${scaleY - 8}" text-anchor="middle" font-size="9" fill="#666">${scaleDist}m</text>`

  return svgWrap(size, size, inner)
}
