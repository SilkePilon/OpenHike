"use client"

import { useEffect, useState } from "react"
import { CircleMarker } from "react-leaflet"

export function UserLocationDot() {
  const [pos, setPos] = useState<[number, number] | null>(null)

  useEffect(() => {
    if (!navigator.geolocation) return
    const id = navigator.geolocation.watchPosition(
      (p) => setPos([p.coords.latitude, p.coords.longitude]),
      () => {},
      { enableHighAccuracy: true, maximumAge: 10000, timeout: 15000 }
    )
    return () => navigator.geolocation.clearWatch(id)
  }, [])

  if (!pos) return null

  return (
    <>
      <CircleMarker
        center={pos}
        radius={16}
        pathOptions={{
          color: "transparent",
          fillColor: "#4285f4",
          fillOpacity: 0.15,
        }}
      />
      <CircleMarker
        center={pos}
        radius={6}
        pathOptions={{
          color: "#fff",
          weight: 2,
          fillColor: "#4285f4",
          fillOpacity: 1,
        }}
      />
    </>
  )
}
