import type { Segment } from "@/lib/types"
import { svgWrap } from "./helpers"
import { compassLabel } from "@/lib/geo"

export function generate(segment: Segment): string {
  const { intersections, legDistances, legBearings } = segment
  if (intersections.length < 2)
    return svgWrap(
      200,
      60,
      '<text x="10" y="30" font-size="14" fill="#666">Te weinig punten</text>'
    )

  const lineH = 24
  const padding = 20
  const w = 340
  const h = padding * 2 + legBearings.length * lineH + 20

  let inner = ""
  inner += `<text x="${padding}" y="${padding}" font-size="12" font-weight="bold" fill="#333">Van</text>`
  inner += `<text x="${padding + 50}" y="${padding}" font-size="12" font-weight="bold" fill="#333">Richting</text>`
  inner += `<text x="${padding + 140}" y="${padding}" font-size="12" font-weight="bold" fill="#333">Graden</text>`
  inner += `<text x="${padding + 220}" y="${padding}" font-size="12" font-weight="bold" fill="#333">Afstand</text>`

  legBearings.forEach((b, i) => {
    const y = padding + (i + 1) * lineH
    inner += `<text x="${padding}" y="${y}" font-size="11" fill="#333">${i + 1}→${i + 2}</text>`
    inner += `<text x="${padding + 50}" y="${y}" font-size="11" fill="#333">${compassLabel(b)}</text>`
    inner += `<text x="${padding + 140}" y="${y}" font-size="11" fill="#333">${b}°</text>`
    inner += `<text x="${padding + 220}" y="${y}" font-size="11" fill="#333">${legDistances[i]}m</text>`
  })

  return svgWrap(w, h, inner)
}
