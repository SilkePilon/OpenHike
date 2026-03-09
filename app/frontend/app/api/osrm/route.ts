import { NextRequest, NextResponse } from "next/server"

const OSRM_URL = "https://router.project-osrm.org"

export async function POST(req: NextRequest) {
  const body = await req.json()
  const { from, to } = body as {
    from: [number, number] // [lat, lng]
    to: [number, number]
  }

  if (!Array.isArray(from) || !Array.isArray(to) || from.length < 2 || to.length < 2) {
    return NextResponse.json(
      { error: "from and to must be [lat, lng] pairs" },
      { status: 400 }
    )
  }

  // OSRM uses lng,lat order
  const coords = `${from[1]},${from[0]};${to[1]},${to[0]}`
  const url = `${OSRM_URL}/route/v1/foot/${coords}?steps=true&geometries=geojson&overview=full`

  try {
    const res = await fetch(url)

    if (!res.ok) {
      const text = await res.text()
      return NextResponse.json(
        { error: `OSRM error: ${res.status}`, detail: text },
        { status: res.status }
      )
    }

    const data = await res.json()
    return NextResponse.json(data)
  } catch (err) {
    return NextResponse.json(
      { error: "Failed to reach OSRM", detail: String(err) },
      { status: 502 }
    )
  }
}
