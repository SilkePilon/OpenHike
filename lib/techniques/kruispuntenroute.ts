import type { Segment } from "@/lib/types"
import { svgWrap, arrowHead } from "./helpers"

export function generate(segment: Segment): string {
  const { intersections, legBearings } = segment
  if (intersections.length === 0)
    return svgWrap(
      200,
      60,
      '<text x="10" y="30" font-size="14" fill="#666">Geen kruispunten gevonden</text>'
    )

  const cellSize = 90
  const padding = 20
  const cols = Math.min(intersections.length, 5)
  const rows = Math.ceil(intersections.length / cols)
  const w = padding * 2 + cols * (cellSize + 20)
  const h = padding * 2 + rows * (cellSize + 30)
  const armLen = cellSize / 2 - 8

  let inner = ""
  intersections.forEach((ix, i) => {
    const col = i % cols
    const row = Math.floor(i / cols)
    const cx = padding + col * (cellSize + 20) + cellSize / 2
    const cy = padding + row * (cellSize + 30) + cellSize / 2

    // Rotation: approach always from bottom
    // For i > 0: approach bearing is legBearings[i-1]
    // For i === 0: orient so exit points up
    const rotation = i > 0 ? -legBearings[i - 1] : -ix.bearing

    // Approach line (always at bottom = 180° display)
    const approachRad = ((180 - 90) * Math.PI) / 180
    const apX = cx + armLen * Math.cos(approachRad)
    const apY = cy + armLen * Math.sin(approachRad)
    inner += `<line x1="${cx}" y1="${cy}" x2="${apX}" y2="${apY}" stroke="#333" stroke-width="2"/>`

    // Side streets (rotated)
    ix.sideStreets.forEach((ss) => {
      const displayBearing = (((ss.bearing + rotation) % 360) + 360) % 360
      const rad = ((displayBearing - 90) * Math.PI) / 180
      const sx = cx + armLen * Math.cos(rad)
      const sy = cy + armLen * Math.sin(rad)
      inner += `<line x1="${cx}" y1="${cy}" x2="${sx}" y2="${sy}" stroke="#aaa" stroke-width="1.5"/>`
    })

    // Exit arrow (rotated, red with arrowhead)
    const exitDisplay = (((ix.bearing + rotation) % 360) + 360) % 360
    const exitRad = ((exitDisplay - 90) * Math.PI) / 180
    const ex = cx + armLen * Math.cos(exitRad)
    const ey = cy + armLen * Math.sin(exitRad)
    inner += `<line x1="${cx}" y1="${cy}" x2="${ex}" y2="${ey}" stroke="#e53e3e" stroke-width="3"/>`
    inner += arrowHead(ex, ey, exitDisplay - 90, 10, "#e53e3e")

    // Center dot
    inner += `<circle cx="${cx}" cy="${cy}" r="4" fill="#333"/>`

    // Number
    inner += `<text x="${cx}" y="${cy + cellSize / 2 + 15}" text-anchor="middle" font-size="11" fill="#666">${i + 1}</text>`
  })

  return svgWrap(w, h, inner)
}
