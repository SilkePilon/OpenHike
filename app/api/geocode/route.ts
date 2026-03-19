import { NextResponse } from "next/server"

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const q = searchParams.get("q")

  if (!q || q.trim().length < 2) {
    return NextResponse.json({ results: [] })
  }

  const url = new URL("https://nominatim.openstreetmap.org/search")
  url.searchParams.set("q", q)
  url.searchParams.set("format", "jsonv2")
  url.searchParams.set("limit", "6")
  url.searchParams.set("addressdetails", "1")

  const res = await fetch(url.toString(), {
    headers: {
      "User-Agent": "OpenHike/1.0",
      Accept: "application/json",
    },
  })

  if (!res.ok) {
    return NextResponse.json({ results: [] })
  }

  const data = await res.json()

  const results = (data as Array<Record<string, unknown>>).map(
    (item: Record<string, unknown>) => ({
      name: item.display_name as string,
      lat: parseFloat(item.lat as string),
      lng: parseFloat(item.lon as string),
      type: item.type as string,
    })
  )

  return NextResponse.json({ results })
}
