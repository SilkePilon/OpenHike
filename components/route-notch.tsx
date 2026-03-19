"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import {
  MapPinPlusIcon,
  SquareIcon,
  EraserIcon,
  Trash2Icon,
  DownloadIcon,
  MapPinIcon,
  RouteIcon,
  ArrowLeftRightIcon,
  Repeat2Icon,
} from "lucide-react"
import type { ProjectStore } from "@/hooks/use-project-store"
import { RouteConfigDialog } from "@/components/route-config-dialog"
import { toast } from "sonner"

interface RouteNotchProps {
  store: ProjectStore
}

export function RouteNotch({ store }: RouteNotchProps) {
  const [configOpen, setConfigOpen] = useState(false)
  const route = store.activeRoute
  if (!route) return null

  const isPlacing = store.editorMode === "adding-waypoints"
  const isPlacingPois = store.editorMode === "adding-pois"
  const isRemoving = store.editorMode === "removing-waypoints"

  return (
    <>
      <div className="absolute top-0 left-1/2 z-10 -translate-x-1/2">
        <div className="flex items-center gap-1 rounded-b-xl border border-t-0 bg-background px-2 py-1.5 shadow-lg">
          {/* Placing waypoints toggle */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                size="icon"
                variant={isPlacing ? "default" : "ghost"}
                className="size-8"
                onClick={() => {
                  const next = isPlacing ? "idle" : "adding-waypoints"
                  store.setEditorMode(next)
                  if (next === "adding-waypoints") {
                    toast.info("Klik op de kaart om punten te plaatsen")
                  }
                }}
              >
                {isPlacing ? <SquareIcon /> : <MapPinPlusIcon />}
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom">
              {isPlacing ? "Stop plaatsen" : "Punten plaatsen"}
            </TooltipContent>
          </Tooltip>

          {/* Remove single waypoint toggle */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                size="icon"
                variant={isRemoving ? "default" : "ghost"}
                className="size-8"
                onClick={() => {
                  const next = isRemoving ? "idle" : "removing-waypoints"
                  store.setEditorMode(next)
                  if (next === "removing-waypoints") {
                    toast.info("Klik op een punt om het te verwijderen")
                  }
                }}
                disabled={route.waypoints.length === 0}
              >
                {isRemoving ? <SquareIcon /> : <EraserIcon />}
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom">
              {isRemoving ? "Stop verwijderen" : "Punt wissen"}
            </TooltipContent>
          </Tooltip>

          {/* Add POIs */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                size="icon"
                variant={isPlacingPois ? "default" : "ghost"}
                className="size-8"
                onClick={() => {
                  const next = isPlacingPois ? "idle" : "adding-pois"
                  store.setEditorMode(next)
                  if (next === "adding-pois") {
                    toast.info("Klik op de kaart om een POI te plaatsen")
                  }
                }}
              >
                {isPlacingPois ? <SquareIcon /> : <MapPinIcon />}
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom">
              {isPlacingPois ? "Stop POIs plaatsen" : "POI plaatsen"}
            </TooltipContent>
          </Tooltip>

          {/* Separator */}
          <div className="mx-1 h-5 w-px bg-border" />

          {/* Snap / Straight toggle */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                size="icon"
                variant={
                  (route.routingMode ?? "snap") === "straight"
                    ? "default"
                    : "ghost"
                }
                className="size-8"
                onClick={() => {
                  const next =
                    (route.routingMode ?? "snap") === "snap"
                      ? "straight"
                      : "snap"
                  store.setRoutingMode(next)
                  toast.info(
                    next === "straight"
                      ? "Rechte lijn modus (hemelsbreed)"
                      : "Wegen-modus (wandelpad)"
                  )
                }}
              >
                <RouteIcon />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom">
              {(route.routingMode ?? "snap") === "snap"
                ? "Schakel naar rechte lijn"
                : "Schakel naar wandelpad"}
            </TooltipContent>
          </Tooltip>

          {/* Reverse route */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                size="icon"
                variant="ghost"
                className="size-8"
                onClick={() => {
                  store.reverseRoute()
                  toast.info("Route omgekeerd")
                }}
                disabled={route.waypoints.length < 2}
              >
                <ArrowLeftRightIcon />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom">Route omkeren</TooltipContent>
          </Tooltip>

          {/* Close loop */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                size="icon"
                variant="ghost"
                className="size-8"
                onClick={() => {
                  store.closeLoop()
                  toast.info("Rondje gesloten")
                }}
                disabled={
                  route.waypoints.length < 3 ||
                  route.segments.some(
                    (s) =>
                      s.fromIndex === route.waypoints.length - 1 &&
                      s.toIndex === 0
                  )
                }
              >
                <Repeat2Icon />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom">Rondje sluiten</TooltipContent>
          </Tooltip>

          {/* Delete route */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                size="icon"
                variant="ghost"
                className="size-8"
                onClick={() => {
                  const name = route.name
                  store.deleteRoute(route.id)
                  toast.info(`Route "${name}" verwijderd`)
                }}
              >
                <Trash2Icon />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom">Route verwijderen</TooltipContent>
          </Tooltip>

          {/* Separator */}
          <div className="mx-1 h-5 w-px bg-border" />

          {/* Export — opens config dialog */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                size="icon"
                variant="ghost"
                className="size-8"
                onClick={() => setConfigOpen(true)}
                disabled={route.segments.length === 0}
              >
                <DownloadIcon />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom">Export</TooltipContent>
          </Tooltip>
        </div>
      </div>

      <RouteConfigDialog
        open={configOpen}
        onOpenChange={setConfigOpen}
        route={route}
        store={store}
      />
    </>
  )
}
