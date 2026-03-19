import type { Segment } from "@/lib/types"
import { svgWrap } from "./helpers"

export function generate(segment: Segment): string {
  const { legBearings, legDistances } = segment
  if (legBearings.length === 0)
    return svgWrap(
      200,
      60,
      '<text x="10" y="30" font-size="14" fill="#666">Te weinig punten</text>'
    )

  const n = legBearings.length
  const padding = 30
  const spacing = 50
  const crossbarHalf = 25
  const w = 220
  const h = padding * 2 + n * spacing

  const cx = w / 2
  const bottomY = h - padding

  let inner = ""

  // Vertical main line
  inner += `<line x1="${cx}" y1="${bottomY}" x2="${cx}" y2="${padding}" stroke="#333" stroke-width="2.5"/>`

  // Start dot at bottom
  inner += `<circle cx="${cx}" cy="${bottomY}" r="5" fill="#333"/>`

  // End line at top
  inner += `<line x1="${cx - 15}" y1="${padding}" x2="${cx + 15}" y2="${padding}" stroke="#333" stroke-width="3"/>`

  // Crossbars with labels (read bottom to top)
  for (let i = 0; i < n; i++) {
    const y = bottomY - i * spacing

    // Horizontal crossbar
    inner += `<line x1="${cx - crossbarHalf}" y1="${y}" x2="${cx + crossbarHalf}" y2="${y}" stroke="#333" stroke-width="1.5"/>`

    // Bearing on left
    inner += `<text x="${cx - crossbarHalf - 6}" y="${y + 4}" text-anchor="end" font-size="11" fill="#333">${Math.round(legBearings[i])}°</text>`

    // Distance on right
    inner += `<text x="${cx + crossbarHalf + 6}" y="${y + 4}" font-size="11" fill="#333">${legDistances[i]}m</text>`
  }

  return svgWrap(w, h, inner)
}
