import { NextRequest, NextResponse } from "next/server"

/**
 * POST /api/elevation
 * Body: { coordinates: [lat, lng][] }
 * Returns: { elevations: number[] }
 *
 * Uses Open-Meteo elevation API (free, no key required).
 */
export async function POST(req: NextRequest) {
  const body = await req.json()
  const { coordinates } = body

  if (
    !Array.isArray(coordinates) ||
    coordinates.length === 0 ||
    !coordinates.every(
      (c: unknown) =>
        Array.isArray(c) &&
        c.length === 2 &&
        typeof c[0] === "number" &&
        typeof c[1] === "number"
    )
  ) {
    return NextResponse.json(
      { error: "coordinates must be an array of [lat, lng] pairs" },
      { status: 400 }
    )
  }

  // Open-Meteo accepts up to ~100 coordinates per request
  // Batch if needed
  const BATCH_SIZE = 100
  const allElevations: number[] = []

  for (let i = 0; i < coordinates.length; i += BATCH_SIZE) {
    const batch = coordinates.slice(i, i + BATCH_SIZE)
    const lats = batch.map((c: number[]) => c[0]).join(",")
    const lngs = batch.map((c: number[]) => c[1]).join(",")

    const url = `https://api.open-meteo.com/v1/elevation?latitude=${lats}&longitude=${lngs}`

    const res = await fetch(url)
    if (!res.ok) {
      const text = await res.text()
      return NextResponse.json(
        { error: `Open-Meteo error: ${res.status}`, detail: text },
        { status: res.status }
      )
    }

    const data = await res.json()
    const elevations: number[] = data.elevation ?? []
    allElevations.push(...elevations)
  }

  return NextResponse.json({ elevations: allElevations })
}
