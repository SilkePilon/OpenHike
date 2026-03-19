"use client"

import { useMemo } from "react"
import { useTheme } from "next-themes"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import type { ProjectStore } from "@/hooks/use-project-store"
import {
  MousePointerClickIcon,
  FootprintsIcon,
  ClockIcon,
  SunIcon,
  MoonIcon,
} from "lucide-react"
import { formatDuration } from "@/lib/format"

export function SiteHeader({ store }: { store: ProjectStore }) {
  const project = store.activeProject
  const route = store.activeRoute
  const { resolvedTheme, setTheme } = useTheme()

  const totals = useMemo(() => {
    if (!route) return { distance: 0, duration: 0 }
    return route.segments.reduce(
      (acc, seg) => ({
        distance: acc.distance + seg.distance,
        duration: acc.duration + seg.duration,
      }),
      { distance: 0, duration: 0 }
    )
  }, [route])

  return (
    <header className="flex h-12 shrink-0 items-center bg-background">
      <div className="flex w-full items-center gap-2 px-4">
        {project ? (
          <div className="flex items-center gap-2 overflow-hidden">
            <span className="truncate text-sm font-medium">{project.name}</span>
            {route && (
              <>
                <Separator
                  orientation="vertical"
                  className="data-[orientation=vertical]:h-4"
                />
                <div
                  className="size-2.5 shrink-0 rounded-full"
                  style={{ backgroundColor: route.color }}
                />
                <span className="truncate text-sm text-muted-foreground">
                  {route.name}
                </span>
                {totals.distance > 0 && (
                  <Badge
                    variant="outline"
                    className="shrink-0 gap-1 text-[11px]"
                  >
                    <FootprintsIcon className="size-3" />
                    {(totals.distance / 1000).toFixed(1)} km
                  </Badge>
                )}
                {totals.duration > 0 && (
                  <Badge
                    variant="outline"
                    className="shrink-0 gap-1 text-[11px]"
                  >
                    <ClockIcon className="size-3" />
                    {formatDuration(totals.duration)}
                  </Badge>
                )}
                {store.editorMode === "adding-waypoints" && (
                  <Badge variant="secondary" className="shrink-0 gap-1">
                    <MousePointerClickIcon className="size-3" />
                    Klik op de kaart om punten te plaatsen
                  </Badge>
                )}
              </>
            )}
          </div>
        ) : (
          <span className="text-sm text-muted-foreground">
            Selecteer of maak een project
          </span>
        )}
      </div>

      <Button
        variant="ghost"
        size="icon"
        className="mr-2 shrink-0"
        onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
        aria-label="Wissel thema"
      >
        <SunIcon className="scale-100 dark:scale-0" />
        <MoonIcon className="absolute scale-0 dark:scale-100" />
      </Button>
    </header>
  )
}
