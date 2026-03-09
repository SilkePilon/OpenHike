import { NextRequest, NextResponse } from "next/server"

const API_KEY = process.env.NEXT_PUBLIC_ORS_API_KEY ?? ""

export async function POST(req: NextRequest) {
  const body = await req.json()
  const { coordinates, alternative_routes } = body

  if (
    !Array.isArray(coordinates) ||
    coordinates.length < 2 ||
    !coordinates.every((c: unknown) => Array.isArray(c) && c.length === 2)
  ) {
    return NextResponse.json(
      { error: "coordinates must be an array of [lng, lat] pairs" },
      { status: 400 }
    )
  }

  const res = await fetch(
    "https://api.openrouteservice.org/v2/directions/foot-hiking/geojson",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: API_KEY,
      },
      body: JSON.stringify({
        coordinates,
        alternative_routes: alternative_routes ?? {
          target_count: 3,
          share_factor: 0.6,
          weight_factor: 1.6,
        },
        instructions: true,
        geometry: true,
      }),
    }
  )

  if (!res.ok) {
    const text = await res.text()
    return NextResponse.json(
      { error: `ORS error: ${res.status}`, detail: text },
      { status: res.status }
    )
  }

  const data = await res.json()
  return NextResponse.json(data)
}
