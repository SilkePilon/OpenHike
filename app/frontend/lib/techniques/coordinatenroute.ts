import type { Segment } from "@/lib/types"
import { svgWrap } from "./helpers"

export function generate(segment: Segment): string {
  const { intersections } = segment
  if (intersections.length === 0)
    return svgWrap(
      200,
      60,
      '<text x="10" y="30" font-size="14" fill="#666">Geen punten</text>'
    )

  const lineH = 24
  const padding = 20
  const w = 320
  const h = padding * 2 + intersections.length * lineH + 20

  let inner = ""
  inner += `<text x="${padding}" y="${padding}" font-size="12" font-weight="bold" fill="#333">Nr.</text>`
  inner += `<text x="${padding + 40}" y="${padding}" font-size="12" font-weight="bold" fill="#333">Breedtegraad</text>`
  inner += `<text x="${padding + 160}" y="${padding}" font-size="12" font-weight="bold" fill="#333">Lengtegraad</text>`

  intersections.forEach((ix, i) => {
    const y = padding + (i + 1) * lineH
    inner += `<text x="${padding}" y="${y}" font-size="11" fill="#333">${i + 1}</text>`
    inner += `<text x="${padding + 40}" y="${y}" font-size="11" fill="#333">${ix.position.lat.toFixed(5)}</text>`
    inner += `<text x="${padding + 160}" y="${y}" font-size="11" fill="#333">${ix.position.lng.toFixed(5)}</text>`
  })

  return svgWrap(w, h, inner)
}
