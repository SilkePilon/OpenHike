"use client"

import { useState, useRef, useCallback, useEffect } from "react"
import { SearchIcon, Loader2Icon, MapPinIcon } from "lucide-react"
import { Input } from "@/components/ui/input"
import type L from "leaflet"
import type { ProjectStore } from "@/hooks/use-project-store"
import { toast } from "sonner"

interface GeoResult {
  name: string
  lat: number
  lng: number
  type: string
}

interface MapSearchProps {
  mapRef: React.RefObject<L.Map | null>
  store: ProjectStore
}

export function MapSearch({ mapRef, store }: MapSearchProps) {
  const [query, setQuery] = useState("")
  const [results, setResults] = useState<GeoResult[]>([])
  const [loading, setLoading] = useState(false)
  const [open, setOpen] = useState(false)
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  const search = useCallback(async (q: string) => {
    if (q.trim().length < 2) {
      setResults([])
      return
    }
    setLoading(true)
    try {
      const res = await fetch(`/api/geocode?q=${encodeURIComponent(q)}`)
      const data = await res.json()
      setResults(data.results ?? [])
      setOpen(true)
    } catch {
      setResults([])
    } finally {
      setLoading(false)
    }
  }, [])

  const handleChange = useCallback(
    (value: string) => {
      setQuery(value)
      if (debounceRef.current) clearTimeout(debounceRef.current)
      debounceRef.current = setTimeout(() => search(value), 350)
    },
    [search]
  )

  const handleSelect = useCallback(
    (result: GeoResult) => {
      mapRef.current?.setView([result.lat, result.lng], 15)
      setOpen(false)
      setQuery("")
      setResults([])

      // If in waypoint placement mode and a route is active, add as waypoint
      if (store.editorMode === "adding-waypoints" && store.activeRoute) {
        store.addWaypoint({ lat: result.lat, lng: result.lng })
        toast.success(`Punt toegevoegd: ${result.name.split(",")[0]}`)
      }
    },
    [mapRef, store]
  )

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  return (
    <div ref={containerRef} className="absolute top-3 left-3 z-10 w-72">
      <div className="relative">
        <SearchIcon className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
        <Input
          type="text"
          placeholder="Zoek plaats, adres of coördinaten..."
          className="pl-9 pr-8 bg-background/95 backdrop-blur shadow-lg"
          value={query}
          onChange={(e) => handleChange(e.target.value)}
          onFocus={() => results.length > 0 && setOpen(true)}
        />
        {loading && (
          <Loader2Icon className="absolute right-2.5 top-2.5 size-4 animate-spin text-muted-foreground" />
        )}
      </div>

      {open && results.length > 0 && (
        <div className="mt-1 max-h-64 overflow-auto rounded-lg border bg-background/95 shadow-lg backdrop-blur">
          {results.map((r, i) => (
            <button
              key={i}
              className="flex w-full items-start gap-2 px-3 py-2 text-left text-sm hover:bg-accent transition-colors"
              onClick={() => handleSelect(r)}
            >
              <MapPinIcon className="mt-0.5 size-3.5 shrink-0 text-muted-foreground" />
              <span className="line-clamp-2">{r.name}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
