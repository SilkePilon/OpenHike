import type { Segment } from "@/lib/types"
import { svgWrap, arrowHead } from "./helpers"

export function generate(segment: Segment): string {
  const { legBearings, legDistances } = segment
  if (legBearings.length === 0)
    return svgWrap(
      200,
      60,
      '<text x="10" y="30" font-size="14" fill="#666">Te weinig punten</text>'
    )

  // Build vector chain: compass bearing → SVG coordinates
  const pts: { x: number; y: number }[] = [{ x: 0, y: 0 }]
  legBearings.forEach((b, i) => {
    const prev = pts[pts.length - 1]
    const rad = (b * Math.PI) / 180
    pts.push({
      x: prev.x + legDistances[i] * Math.sin(rad),
      y: prev.y - legDistances[i] * Math.cos(rad),
    })
  })

  // Scale to fit
  const padding = 50
  const size = 400
  const minX = Math.min(...pts.map((p) => p.x))
  const maxX = Math.max(...pts.map((p) => p.x))
  const minY = Math.min(...pts.map((p) => p.y))
  const maxY = Math.max(...pts.map((p) => p.y))
  const rangeX = maxX - minX || 1
  const rangeY = maxY - minY || 1
  const scale = Math.min(
    (size - padding * 2) / rangeX,
    (size - padding * 2) / rangeY
  )

  const toSvgX = (x: number) => padding + (x - minX) * scale
  const toSvgY = (y: number) => padding + (y - minY) * scale

  let inner = ""

  // Draw vectors with arrowheads
  for (let i = 0; i < legBearings.length; i++) {
    const x1 = toSvgX(pts[i].x)
    const y1 = toSvgY(pts[i].y)
    const x2 = toSvgX(pts[i + 1].x)
    const y2 = toSvgY(pts[i + 1].y)

    inner += `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="#333" stroke-width="2"/>`

    const angle = (Math.atan2(y2 - y1, x2 - x1) * 180) / Math.PI
    inner += arrowHead(x2, y2, angle, 8, "#333")

    // Point number
    inner += `<text x="${x1 + 8}" y="${y1 - 8}" font-size="10" fill="#666">${i + 1}</text>`
  }

  // Last point number
  const last = pts[pts.length - 1]
  inner += `<text x="${toSvgX(last.x) + 8}" y="${toSvgY(last.y) - 8}" font-size="10" fill="#666">${pts.length}</text>`

  // Start / end dots
  inner += `<circle cx="${toSvgX(0)}" cy="${toSvgY(0)}" r="5" fill="#16a34a"/>`
  inner += `<circle cx="${toSvgX(last.x)}" cy="${toSvgY(last.y)}" r="5" fill="#e53e3e"/>`

  // North double-arrow (top-right corner)
  const naX = size - 30
  const naY = 35
  const naLen = 30
  inner += `<line x1="${naX}" y1="${naY + naLen}" x2="${naX}" y2="${naY}" stroke="#333" stroke-width="2.5"/>`
  inner += arrowHead(naX, naY, -90, 10, "#333")
  inner += arrowHead(naX, naY + 7, -90, 7, "#333")
  inner += `<text x="${naX}" y="${naY - 10}" text-anchor="middle" font-size="12" font-weight="bold" fill="#333">N</text>`

  return svgWrap(size, size, inner)
}
