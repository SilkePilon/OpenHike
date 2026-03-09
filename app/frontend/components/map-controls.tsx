"use client"

import { useCallback, useState } from "react"
import type L from "leaflet"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { Locate, Loader2Icon, Plus, Minus } from "lucide-react"

interface MapControlsProps {
  mapRef: React.RefObject<L.Map | null>
}

export function MapControls({ mapRef }: MapControlsProps) {
  const [locating, setLocating] = useState(false)

  const handleZoomIn = useCallback(() => {
    mapRef.current?.zoomIn()
  }, [mapRef])

  const handleZoomOut = useCallback(() => {
    mapRef.current?.zoomOut()
  }, [mapRef])

  const handleLocate = useCallback(() => {
    if (!navigator.geolocation) return
    setLocating(true)
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        mapRef.current?.setView([pos.coords.latitude, pos.coords.longitude], 16)
        setLocating(false)
      },
      () => setLocating(false),
      { enableHighAccuracy: true, timeout: 10000 }
    )
  }, [mapRef])

  return (
    <div className="absolute right-4 bottom-4 z-10 flex flex-col items-center gap-2">
      {/* Locate me */}
      <Button
        variant="outline"
        size="icon"
        className="size-10 rounded-xl !bg-background/90 backdrop-blur"
        onClick={handleLocate}
        disabled={locating}
        aria-label="Ga naar mijn locatie"
      >
        {locating ? (
          <Loader2Icon className="size-4 animate-spin" />
        ) : (
          <Locate className="size-4" />
        )}
      </Button>

      {/* Zoom */}
      <div className="flex flex-col overflow-hidden rounded-xl border bg-background/90 backdrop-blur">
        <Button
          variant="ghost"
          size="icon"
          className="size-10 rounded-none"
          onClick={handleZoomIn}
          aria-label="Zoom in"
        >
          <Plus className="size-4" />
        </Button>
        <Separator />
        <Button
          variant="ghost"
          size="icon"
          className="size-10 rounded-none"
          onClick={handleZoomOut}
          aria-label="Zoom out"
        >
          <Minus className="size-4" />
        </Button>
      </div>
    </div>
  )
}
