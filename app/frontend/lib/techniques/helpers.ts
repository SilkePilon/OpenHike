// ── Shared SVG helpers for technique generators ──────────

export function svgWrap(
  width: number,
  height: number,
  inner: string,
  bg = "#fff"
): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}"><rect width="${width}" height="${height}" fill="${bg}"/>${inner}</svg>`
}

export function arrowHead(
  x: number,
  y: number,
  angle: number,
  size = 8,
  color = "#333"
): string {
  const rad = (angle * Math.PI) / 180
  const ax = x + size * Math.cos(rad - 2.6)
  const ay = y + size * Math.sin(rad - 2.6)
  const bx = x + size * Math.cos(rad + 2.6)
  const by = y + size * Math.sin(rad + 2.6)
  return `<polygon points="${x},${y} ${ax},${ay} ${bx},${by}" fill="${color}"/>`
}
