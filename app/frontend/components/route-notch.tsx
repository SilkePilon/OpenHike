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

          {/* Clear waypoints */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                size="icon"
                variant="ghost"
                className="size-8"
                onClick={() => {
                  store.clearWaypoints()
                  toast.info("Alle punten gewist")
                }}
                disabled={route.waypoints.length === 0}
              >
                <EraserIcon />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom">Punten wissen</TooltipContent>
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
