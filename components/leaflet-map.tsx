"use client"

import { useEffect, useMemo } from "react"
import L from "leaflet"
import "leaflet/dist/leaflet.css"
import {
  MapContainer,
  TileLayer,
  Polyline,
  Marker,
  useMap,
  useMapEvents,
} from "react-leaflet"
import { useTheme } from "next-themes"
import { DEFAULT_CENTER, DEFAULT_ZOOM, TECHNIQUE_COLORS } from "@/lib/types"
import type { ProjectStore } from "@/hooks/use-project-store"
import { SegmentBadges } from "@/components/map/segment-badges"
import { RouteDragHandler } from "@/components/map/route-drag-handler"
import { UserLocationDot } from "@/components/map/user-location-dot"
import { FitBounds } from "@/components/map/fit-bounds"
import { toast } from "sonner"

// ── Numbered circle marker icon ──────────────────────────
function createNumberedIcon(
  num: number,
  color: string,
  isActive: boolean
): L.DivIcon {
  const size = isActive ? 24 : 18
  const borderColor = isActive ? "#fff" : color
  const borderWidth = isActive ? 2 : 1
  const opacity = isActive ? 1 : 0.45

  return L.divIcon({
    className: "",
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
    html: `<div style="width:${size}px;height:${size}px;border-radius:50%;background:${color};border:${borderWidth}px solid ${borderColor};display:flex;align-items:center;justify-content:center;color:#fff;font-size:11px;font-weight:bold;opacity:${opacity};box-shadow:0 1px 3px rgba(0,0,0,.3)">${num}</div>`,
  })
}

// ── Small ghost (redirect) marker icon ───────────────────
function createGhostIcon(color: string): L.DivIcon {
  return L.divIcon({
    className: "",
    iconSize: [10, 10],
    iconAnchor: [5, 5],
    html: `<div style="width:10px;height:10px;border-radius:50%;background:${color};border:2px solid #fff;opacity:0.7;box-shadow:0 1px 3px rgba(0,0,0,.25);cursor:pointer"></div>`,
  })
}

// ── Click handler ────────────────────────────────────────
function MapClickHandler({ store }: { store: ProjectStore }) {
  useMapEvents({
    click(e) {
      if (store.editorMode !== "adding-waypoints" || !store.activeRoute) return
      store.addWaypoint({ lat: e.latlng.lat, lng: e.latlng.lng })
      const count =
        store.activeRoute.waypoints.filter((w) => !w.ghost).length + 1
      toast.success(`Punt ${count} geplaatst`)
    },
  })
  return null
}

// ── Cursor style ─────────────────────────────────────────
function CursorStyle({ store }: { store: ProjectStore }) {
  const map = useMap()
  useEffect(() => {
    const container = map.getContainer()
    if (store.editorMode === "adding-waypoints") {
      container.style.cursor = "crosshair"
    } else {
      container.style.cursor = ""
    }
  }, [map, store.editorMode])
  return null
}

// ── Register tile-caching service worker ─────────────────
if (typeof window !== "undefined" && "serviceWorker" in navigator) {
  navigator.serviceWorker.register("/tile-sw.js").catch(() => {})
}

// ── Capture map instance into external ref ───────────────
function MapRefSetter({ mapRef }: { mapRef: React.RefObject<L.Map | null> }) {
  const map = useMap()
  useEffect(() => {
    ;(mapRef as React.MutableRefObject<L.Map | null>).current = map
    return () => {
      ;(mapRef as React.MutableRefObject<L.Map | null>).current = null
    }
  }, [map, mapRef])
  return null
}

// ── Main component ───────────────────────────────────────
interface LeafletMapProps {
  store: ProjectStore
  mapRef: React.RefObject<L.Map | null>
}

// ── Toggle dark-tiles class on map container ────────────
function DarkTilesClass({ isDark }: { isDark: boolean }) {
  const map = useMap()
  useEffect(() => {
    const el = map.getContainer()
    el.classList.toggle("dark-tiles", isDark)
  }, [map, isDark])
  return null
}

const TILE_LIGHT =
  "https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
const TILE_DARK =
  "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"

// CSS filter to lighten the dark tiles slightly
const DARK_TILE_STYLE = `
  .leaflet-container.dark-tiles .leaflet-tile-pane {
    filter: brightness(1.3);
  }
`

export default function LeafletMapComponent({
  store,
  mapRef,
}: LeafletMapProps) {
  const { resolvedTheme } = useTheme()
  const tileUrl = resolvedTheme === "dark" ? TILE_DARK : TILE_LIGHT
  const project = store.activeProject

  // Collect all polylines to render
  const polylines = useMemo(() => {
    if (!project) return []
    const lines: {
      key: string
      positions: [number, number][]
      color: string
      opacity: number
      weight: number
    }[] = []

    for (const r of project.routes) {
      const isActive = r.id === store.activeRouteId
      for (const seg of r.segments) {
        if (seg.path.length < 2) continue
        lines.push({
          key: `${r.id}-${seg.id}`,
          positions: seg.path.map((p) => [p.lat, p.lng]),
          color: TECHNIQUE_COLORS[seg.technique],
          opacity: isActive ? 1 : 0.45,
          weight: isActive ? 5 : 3,
        })
      }
    }
    return lines
  }, [project, store.activeRouteId])

  // Collect all waypoint markers (numbered + ghost)
  const markers = useMemo(() => {
    if (!project) return []
    const result: {
      key: string
      position: [number, number]
      icon: L.DivIcon
      zIndex: number
      draggable: boolean
      waypointId: string
      ghost: boolean
    }[] = []

    for (const r of project.routes) {
      const isActive = r.id === store.activeRouteId
      let num = 0
      for (let i = 0; i < r.waypoints.length; i++) {
        const wp = r.waypoints[i]
        if (wp.ghost) {
          if (isActive) {
            result.push({
              key: wp.id,
              position: [wp.position.lat, wp.position.lng],
              icon: createGhostIcon(r.color),
              zIndex: 50,
              draggable: true,
              waypointId: wp.id,
              ghost: true,
            })
          }
          continue
        }
        num++
        result.push({
          key: wp.id,
          position: [wp.position.lat, wp.position.lng],
          icon: createNumberedIcon(num, r.color, isActive),
          zIndex: isActive ? 100 : 1,
          draggable: isActive,
          waypointId: wp.id,
          ghost: false,
        })
      }
    }
    return result
  }, [project, store.activeRouteId])

  return (
    <>
      {resolvedTheme === "dark" && (
        <style dangerouslySetInnerHTML={{ __html: DARK_TILE_STYLE }} />
      )}
      <MapContainer
        center={[DEFAULT_CENTER.lat, DEFAULT_CENTER.lng]}
        zoom={DEFAULT_ZOOM}
        zoomControl={false}
        attributionControl={false}
        preferCanvas={true}
        className="z-0 size-full rounded-t-xl outline-none"
      >
        <DarkTilesClass isDark={resolvedTheme === "dark"} />
        <TileLayer
          key={tileUrl}
          url={tileUrl}
          keepBuffer={4}
          updateWhenZooming={false}
          updateWhenIdle={false}
          maxZoom={19}
          subdomains="abcd"
        />

        <MapRefSetter mapRef={mapRef} />
        <MapClickHandler store={store} />
        <CursorStyle store={store} />
        <FitBounds store={store} />
        <SegmentBadges store={store} />
        <RouteDragHandler store={store} />
        <UserLocationDot />

        {polylines.map((line) => (
          <Polyline
            key={line.key}
            positions={line.positions}
            pathOptions={{
              color: line.color,
              opacity: line.opacity,
              weight: line.weight,
            }}
          />
        ))}

        {markers.map((m) => (
          <Marker
            key={m.key}
            position={m.position}
            icon={m.icon}
            zIndexOffset={m.zIndex}
            draggable={m.draggable}
            eventHandlers={{
              dragend: m.draggable
                ? (e) => {
                    const latlng = e.target.getLatLng()
                    store.moveWaypoint(m.waypointId, {
                      lat: latlng.lat,
                      lng: latlng.lng,
                    })
                    if (m.ghost) {
                      toast.success("Omleidpunt verplaatst")
                    }
                  }
                : undefined,
              click: () => {
                if (m.ghost) {
                  store.removeWaypoint(m.waypointId)
                  toast.info("Omleidpunt verwijderd", {
                    description: "Route wordt opnieuw berekend.",
                  })
                  return
                }
                if (store.editorMode === "adding-waypoints") {
                  store.closeRouteToWaypoint(m.waypointId)
                  toast.success("Route gesloten", {
                    description: "Route is verbonden met dit punt.",
                  })
                }
              },
            }}
          />
        ))}
      </MapContainer>
    </>
  )
}
