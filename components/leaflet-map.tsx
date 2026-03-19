"use client"

import { useEffect, useMemo, useRef, useCallback, useState } from "react"
import L from "leaflet"
import "leaflet/dist/leaflet.css"
import {
  MapContainer,
  TileLayer,
  Marker,
  useMap,
  useMapEvents,
} from "react-leaflet"
import { useTheme } from "next-themes"
import {
  DEFAULT_CENTER,
  DEFAULT_ZOOM,
  TECHNIQUE_COLORS,
  POI_META,
} from "@/lib/types"
import type { POI } from "@/lib/types"
import type { ProjectStore } from "@/hooks/use-project-store"
import { SegmentBadges } from "@/components/map/segment-badges"
import { RouteDragHandler } from "@/components/map/route-drag-handler"
import { UserLocationDot } from "@/components/map/user-location-dot"
import { FitBounds } from "@/components/map/fit-bounds"
import { PoiEditDialog } from "@/components/poi-edit-dialog"
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

// ── POI marker icon ──────────────────────────────────────
function createPoiIcon(emoji: string, poiId?: string): L.DivIcon {
  const dataAttr = poiId ? ` data-poi-id="${poiId}"` : ""
  return L.divIcon({
    className: "",
    iconSize: [28, 28],
    iconAnchor: [14, 14],
    html: `<div style="width:28px;height:28px;border-radius:6px;background:#fff;border:2px solid #374151;display:flex;align-items:center;justify-content:center;font-size:14px;box-shadow:0 2px 4px rgba(0,0,0,.3);cursor:pointer" data-poi-marker${dataAttr}>${emoji}</div>`,
  })
}

// ── POI hover tooltip (rendered into the Leaflet pane) ───
function escapeHtml(str: string) {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
}

function PoiTooltipLayer({ store }: { store: ProjectStore }) {
  const map = useMap()
  const tooltipRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    const container = map.getContainer()
    const tooltip = document.createElement("div")
    tooltip.className = "poi-tooltip"
    tooltip.style.cssText =
      "position:absolute;z-index:1000;pointer-events:none;opacity:0;transform:translateY(4px) translateX(-50%);transition:opacity .2s ease,transform .2s ease;background:var(--background,#fff);color:var(--foreground,#111);border:1px solid var(--border,#e5e7eb);border-radius:10px;padding:6px 10px;box-shadow:0 4px 12px rgba(0,0,0,.15);max-width:220px;font-size:13px;line-height:1.4;"
    container.appendChild(tooltip)
    tooltipRef.current = tooltip

    const show = (e: MouseEvent) => {
      const target = e.target as HTMLElement
      const marker = target.closest("[data-poi-marker]") as HTMLElement | null
      if (!marker) return
      const poiId = marker.getAttribute("data-poi-id")
      if (!poiId) return

      // Find POI data
      let poi: POI | undefined
      for (const r of store.activeProject?.routes ?? []) {
        poi = r.pois?.find((p) => p.id === poiId)
        if (poi) break
      }
      if (!poi) return

      const emoji = escapeHtml(
        poi.icon || POI_META[poi.category]?.emoji || "📍"
      )
      const name = escapeHtml(poi.name || "POI")
      const note = escapeHtml(poi.note || "")

      tooltip.innerHTML = `<div style="display:flex;align-items:flex-start;gap:6px"><span style="font-size:20px;line-height:1">${emoji}</span><div><div style="font-weight:600">${name}</div>${note ? `<div style="opacity:.65;margin-top:2px">${note}</div>` : ""}</div></div>`

      const rect = marker.getBoundingClientRect()
      const containerRect = container.getBoundingClientRect()
      tooltip.style.left = `${rect.left - containerRect.left + rect.width / 2}px`
      tooltip.style.top = `${rect.top - containerRect.top - 8}px`
      tooltip.style.opacity = "1"
      tooltip.style.transform = "translateY(-100%) translateX(-50%)"
    }

    const hide = (e: MouseEvent) => {
      const target = e.relatedTarget as HTMLElement | null
      if (target?.closest?.("[data-poi-marker]")) return
      tooltip.style.opacity = "0"
      tooltip.style.transform = "translateY(4px) translateX(-50%)"
    }

    container.addEventListener("mouseover", show)
    container.addEventListener("mouseout", hide)

    return () => {
      container.removeEventListener("mouseover", show)
      container.removeEventListener("mouseout", hide)
      tooltip.remove()
    }
  }, [map, store])

  return null
}

// ── Animated polyline (SVG stroke-dashoffset, strict-mode safe) ──
function AnimatedPolyline({
  positions,
  color,
  opacity,
  weight,
  animate = true,
}: {
  positions: [number, number][]
  color: string
  opacity: number
  weight: number
  animate?: boolean
}) {
  const map = useMap()
  const lineRef = useRef<L.Polyline | null>(null)

  // Stable identity string so we only recreate when the path actually changes
  const posKey = useMemo(() => {
    if (positions.length < 2) return ""
    return `${positions.length}|${positions[0][0]},${positions[0][1]}|${positions[positions.length - 1][0]},${positions[positions.length - 1][1]}`
  }, [positions])

  // Keep a ref so the effect always reads the latest positions array
  const posRef = useRef(positions)
  posRef.current = positions

  // Style-only updates (no animation, no recreation)
  const syncStyle = useCallback(() => {
    lineRef.current?.setStyle({ color, opacity, weight })
  }, [color, opacity, weight])

  useEffect(() => {
    syncStyle()
  }, [syncStyle])

  // Main lifecycle: create polyline, optionally animate, clean up fully
  useEffect(() => {
    const pts = posRef.current
    if (pts.length < 2 || !posKey) return

    // Fresh SVG renderer per cycle so strict-mode remounts work cleanly
    const renderer = L.svg({ padding: 0.5 })

    const line = L.polyline(pts, {
      color,
      opacity,
      weight,
      fill: false,
      interactive: false,
      renderer,
    }).addTo(map)
    lineRef.current = line

    let timer: ReturnType<typeof setTimeout> | undefined
    let fallback: ReturnType<typeof setTimeout> | undefined

    if (animate && pts.length > 2) {
      // _path exists immediately after addTo with an SVG renderer
      const pathEl = (line as any)._path as SVGPathElement | undefined
      if (pathEl) {
        const totalLen = pathEl.getTotalLength()
        if (totalLen > 0) {
          // Immediately hide — no flash
          pathEl.style.strokeDasharray = `${totalLen}`
          pathEl.style.strokeDashoffset = `${totalLen}`
          pathEl.style.transition = "none"

          // On next frame, start reveal transition
          timer = setTimeout(() => {
            pathEl.style.transition =
              "stroke-dashoffset 1.2s cubic-bezier(0.22, 1, 0.36, 1)"
            pathEl.style.strokeDashoffset = "0"
          }, 20)

          // Clean dash styles after animation so zoom/pan works
          const onEnd = () => {
            pathEl.style.strokeDasharray = ""
            pathEl.style.strokeDashoffset = ""
            pathEl.style.transition = ""
          }
          pathEl.addEventListener("transitionend", onEnd, { once: true })
          fallback = setTimeout(onEnd, 1500)
        }
      }
    }

    return () => {
      if (timer) clearTimeout(timer)
      if (fallback) clearTimeout(fallback)
      line.remove()
      renderer.remove()
      lineRef.current = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map, posKey])

  return null
}

// ── Click handler ────────────────────────────────────────
function MapClickHandler({
  store,
  onPoiPlaced,
}: {
  store: ProjectStore
  onPoiPlaced: (poiId: string) => void
}) {
  useMapEvents({
    click(e) {
      if (store.editorMode === "adding-waypoints" && store.activeRoute) {
        store.addWaypoint({ lat: e.latlng.lat, lng: e.latlng.lng })
        const count =
          store.activeRoute.waypoints.filter((w) => !w.ghost).length + 1
        toast.success(`Punt ${count} geplaatst`)
      } else if (store.editorMode === "adding-pois" && store.activeRoute) {
        const poiId = store.addPoi(
          { lat: e.latlng.lat, lng: e.latlng.lng },
          "custom",
          `POI ${(store.activeRoute.pois?.length ?? 0) + 1}`
        )
        if (poiId) {
          onPoiPlaced(poiId)
        }
      }
    },
  })
  return null
}

// ── Cursor style ─────────────────────────────────────────
function CursorStyle({ store }: { store: ProjectStore }) {
  const map = useMap()
  useEffect(() => {
    const container = map.getContainer()
    if (
      store.editorMode === "adding-waypoints" ||
      store.editorMode === "adding-pois"
    ) {
      container.style.cursor = "crosshair"
    } else if (store.editorMode === "removing-waypoints") {
      container.style.cursor = "pointer"
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

  // POI dialog state
  const [editingPoiId, setEditingPoiId] = useState<string | null>(null)
  const editingPoi = useMemo(() => {
    if (!editingPoiId || !project) return null
    for (const r of project.routes) {
      const poi = r.pois?.find((p) => p.id === editingPoiId)
      if (poi) return poi
    }
    return null
  }, [editingPoiId, project])

  const handlePoiPlaced = useCallback((poiId: string) => {
    setEditingPoiId(poiId)
  }, [])

  // Force a fresh MapContainer after HMR by using a mount key
  const [mapKey, setMapKey] = useState(0)
  useEffect(() => {
    return () => {
      // On unmount (HMR), bump key so a fresh MapContainer is created next render
      setMapKey((k) => k + 1)
    }
  }, [])

  // Collect all polylines to render
  const polylines = useMemo(() => {
    if (!project) return []
    const lines: {
      key: string
      positions: [number, number][]
      color: string
      opacity: number
      weight: number
      animate: boolean
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
          animate: isActive,
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

  // Collect POI markers
  const poiMarkers = useMemo(() => {
    if (!project) return []
    const result: {
      key: string
      position: [number, number]
      icon: L.DivIcon
      poiId: string
      draggable: boolean
    }[] = []

    for (const r of project.routes) {
      const isActive = r.id === store.activeRouteId
      for (const poi of r.pois ?? []) {
        const emoji =
          poi.icon || POI_META[poi.category]?.emoji || "\uD83D\uDCCD"
        result.push({
          key: poi.id,
          position: [poi.position.lat, poi.position.lng],
          icon: createPoiIcon(emoji, poi.id),
          poiId: poi.id,
          draggable: isActive,
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
        key={mapKey}
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
        <MapClickHandler store={store} onPoiPlaced={handlePoiPlaced} />
        <CursorStyle store={store} />
        <FitBounds store={store} />
        <SegmentBadges store={store} />
        <RouteDragHandler store={store} />
        <UserLocationDot />
        <PoiTooltipLayer store={store} />

        {polylines.map((line) => (
          <AnimatedPolyline
            key={line.key}
            positions={line.positions}
            color={line.color}
            opacity={line.opacity}
            weight={line.weight}
            animate={line.animate}
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
                if (store.editorMode === "removing-waypoints") {
                  store.removeWaypoint(m.waypointId)
                  toast.info(
                    m.ghost ? "Omleidpunt verwijderd" : "Punt verwijderd"
                  )
                  return
                }
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

        {poiMarkers.map((m) => (
          <Marker
            key={m.key}
            position={m.position}
            icon={m.icon}
            zIndexOffset={200}
            draggable={m.draggable}
            eventHandlers={{
              dragend: m.draggable
                ? (e) => {
                    const latlng = e.target.getLatLng()
                    store.movePoi(m.poiId, { lat: latlng.lat, lng: latlng.lng })
                  }
                : undefined,
              click: () => {
                setEditingPoiId(m.poiId)
              },
            }}
          />
        ))}
      </MapContainer>

      <PoiEditDialog
        open={!!editingPoiId}
        onOpenChange={(open) => {
          if (!open) setEditingPoiId(null)
        }}
        initialEmoji={
          editingPoi?.icon ||
          POI_META[editingPoi?.category ?? "custom"]?.emoji ||
          "📍"
        }
        initialName={editingPoi?.name || ""}
        initialNote={editingPoi?.note || ""}
        onSave={(emoji, name, note) => {
          if (editingPoiId) {
            store.updatePoi(editingPoiId, { icon: emoji, name, note })
            toast.success("POI opgeslagen")
          }
        }}
        onDelete={
          editingPoiId
            ? () => {
                store.removePoi(editingPoiId)
                setEditingPoiId(null)
                toast.info("POI verwijderd")
              }
            : undefined
        }
      />
    </>
  )
}
