import type { Segment } from "@/lib/types"
import { svgWrap } from "./helpers"

/**
 * Stripkaart — "visgraat" (fishbone) route technique.
 *
 * A single vertical line represents the walking route (bottom → top).
 * At each intersection, side streets are drawn as short horizontal dashes
 * on the correct side (left / right relative to walking direction).
 * ALL side streets are shown, not just the turns you take.
 *
 * Start = thick horizontal line at bottom.
 * End   = × cross at top.
 * No dots, no numbers, no distance labels.
 */
export function generate(segment: Segment): string {
  const { intersections, legBearings } = segment
  if (intersections.length < 2)
    return svgWrap(
      200,
      60,
      '<text x="10" y="30" font-size="14" fill="#666">Te weinig kruispunten</text>'
    )

  // Build rows: one per intersection, each with left/right side-street dashes
  type Row = { sides: (-1 | 1)[] }
  const rows: Row[] = []

  intersections.forEach((ix, i) => {
    // Walking direction: bearing of the leg LEAVING this intersection
    const walkDir =
      i < legBearings.length
        ? legBearings[i]
        : i > 0 && legBearings[i - 1] !== undefined
          ? legBearings[i - 1]
          : 0

    const sides: (-1 | 1)[] = []
    ix.sideStreets.forEach((ss) => {
      const rel = (((ss.bearing - walkDir) % 360) + 360) % 360
      // 0–180° CW from walk dir = right, 180–360° = left
      sides.push(rel > 0 && rel < 180 ? 1 : -1)
    })

    rows.push({ sides })

    console.log(
      `[Stripkaart] Intersection ${i}: walkDir=${Math.round(walkDir)}°, ` +
        `sideStreets=${ix.sideStreets.length} [${ix.sideStreets.map((s) => `${Math.round(s.bearing)}°`).join(", ")}], ` +
        `sides=[${sides.map((s) => (s === 1 ? "R" : "L")).join(", ")}]`
    )
  })

  // Only show intersections that actually have side streets (= visible rows)
  const visibleRows = rows
    .map((r, i) => ({ ...r, origIndex: i }))
    .filter((r) => r.sides.length > 0)

  console.log(
    `[Stripkaart] ${rows.length} intersections total, ${visibleRows.length} with side streets`
  )

  const rowCount = Math.max(visibleRows.length, 1)
  const w = 120
  const ySpacing = 28
  const padding = 30
  const h = padding * 2 + (rowCount + 1) * ySpacing // +1 for start/end room
  const cx = w / 2
  const sideLen = 22

  let inner = ""

  // Main vertical line
  const yBottom = h - padding
  const yTop = padding
  inner += `<line x1="${cx}" y1="${yBottom}" x2="${cx}" y2="${yTop}" stroke="#333" stroke-width="2.5"/>`

  // Draw visible rows at even spacing
  const areaTop = padding + 12
  const areaBottom = h - padding - 8
  visibleRows.forEach((row, i) => {
    const cy =
      rowCount === 1
        ? (areaTop + areaBottom) / 2
        : areaBottom - (i / (rowCount - 1)) * (areaBottom - areaTop)

    row.sides.forEach((side) => {
      inner += `<line x1="${cx}" y1="${cy}" x2="${cx + side * sideLen}" y2="${cy}" stroke="#333" stroke-width="1.5"/>`
    })
  })

  // Start marker: thick horizontal line at bottom
  inner += `<line x1="${cx - 12}" y1="${yBottom}" x2="${cx + 12}" y2="${yBottom}" stroke="#333" stroke-width="4" stroke-linecap="round"/>`

  // End marker: × cross at top
  const crossSize = 7
  inner += `<line x1="${cx - crossSize}" y1="${yTop - crossSize}" x2="${cx + crossSize}" y2="${yTop + crossSize}" stroke="#333" stroke-width="2.5" stroke-linecap="round"/>`
  inner += `<line x1="${cx + crossSize}" y1="${yTop - crossSize}" x2="${cx - crossSize}" y2="${yTop + crossSize}" stroke="#333" stroke-width="2.5" stroke-linecap="round"/>`

  return svgWrap(w, h, inner)
}
