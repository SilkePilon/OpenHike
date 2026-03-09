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

  const padding = 40
  const spacing = 80
  const w = padding * 2 + intersections.length * spacing
  const h = 130
  const armLen = 22
  const exitLen = 25

  let inner = ""
  intersections.forEach((ix, i) => {
    const cx = padding + i * spacing
    const cy = h / 2

    // Rotation: approach always from the left (270° display → approach backward dir)
    // rotation = 90° - approachBearing
    const approachBearing =
      i > 0 && legBearings[i - 1] !== undefined
        ? legBearings[i - 1]
        : ix.bearing
    const rotation = 90 - approachBearing

    // Incoming line (always horizontal from left)
    inner += `<line x1="${cx - armLen}" y1="${cy}" x2="${cx}" y2="${cy}" stroke="#333" stroke-width="2"/>`

    // Side street stump lines (rotated, no arrowhead)
    ix.sideStreets.forEach((ss) => {
      const displayBearing = (((ss.bearing + rotation) % 360) + 360) % 360
      const rad = ((displayBearing - 90) * Math.PI) / 180
      const sx = cx + armLen * Math.cos(rad)
      const sy = cy + armLen * Math.sin(rad)
      inner += `<line x1="${cx}" y1="${cy}" x2="${sx}" y2="${sy}" stroke="#333" stroke-width="1.5"/>`
    })

    // Exit arrow (rotated, with arrowhead)
    const exitDisplay = (((ix.bearing + rotation) % 360) + 360) % 360
    const exitRad = ((exitDisplay - 90) * Math.PI) / 180
    const ax = cx + exitLen * Math.cos(exitRad)
    const ay = cy + exitLen * Math.sin(exitRad)
    inner += `<line x1="${cx}" y1="${cy}" x2="${ax}" y2="${ay}" stroke="#333" stroke-width="2.5"/>`
    inner += arrowHead(ax, ay, exitDisplay - 90)

    // Dot (on top of everything)
    inner += `<circle cx="${cx}" cy="${cy}" r="6" fill="#333"/>`

    // Number label
    inner += `<text x="${cx}" y="${cy + 38}" text-anchor="middle" font-size="11" fill="#666">${i + 1}</text>`
  })

  return svgWrap(w, h, inner)
}
