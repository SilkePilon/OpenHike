"use client"

import { useState, useMemo } from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  ArrowLeftIcon,
  ArrowRightIcon,
  CheckIcon,
  CompassIcon,
  DownloadIcon,
  FootprintsIcon,
  ClockIcon,
  SparklesIcon,
  Loader2Icon,
} from "lucide-react"
import type { ProjectStore } from "@/hooks/use-project-store"
import type { Route } from "@/lib/types"
import type { TechniqueType } from "@/lib/types"
import {
  TECHNIQUE_META,
  TECHNIQUE_COLORS,
  ALL_TECHNIQUE_TYPES,
} from "@/lib/types"
import { exportRouteAsZip } from "@/lib/export"
import { generateTechniques } from "@/lib/techniques"
import { RoutePreview } from "@/components/route-preview"
import { formatDuration, formatDistance } from "@/lib/format"

const STEPS = [
  { title: "Routetechnieken", description: "Kies een techniek per segment." },
  { title: "Exporteren", description: "Genereer en download je technieken." },
]

interface RouteConfigDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  route: Route
  store: ProjectStore
}

export function RouteConfigDialog({
  open,
  onOpenChange,
  route,
  store,
}: RouteConfigDialogProps) {
  const [step, setStep] = useState(0)

  const totals = useMemo(
    () =>
      route.segments.reduce(
        (acc, seg) => ({
          distance: acc.distance + seg.distance,
          duration: acc.duration + seg.duration,
        }),
        { distance: 0, duration: 0 }
      ),
    [route.segments]
  )

  const canGenerate =
    !store.isLoadingDirections &&
    route.segments.length > 0 &&
    route.segments.some((s) => s.intersections.length > 0)

  function handleClose(val: boolean) {
    if (!val) setStep(0)
    onOpenChange(val)
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-xl" showCloseButton>
        {/* Header */}
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <div
              className="size-3 shrink-0 rounded-full"
              style={{ backgroundColor: route.color }}
            />
            {route.name}
          </DialogTitle>
          <DialogDescription>{STEPS[step].description}</DialogDescription>
        </DialogHeader>

        {/* Route preview + totals bar */}
        {route.waypoints.length >= 2 && (
          <div className="flex items-center justify-center rounded-lg border bg-muted/30">
            <RoutePreview route={route} width={480} height={100} />
          </div>
        )}
        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          <div className="flex items-center gap-1.5">
            <FootprintsIcon className="size-3.5" />
            <span className="font-medium">
              {formatDistance(totals.distance)}
            </span>
          </div>
          <Separator
            orientation="vertical"
            className="data-[orientation=vertical]:h-3"
          />
          <div className="flex items-center gap-1.5">
            <ClockIcon className="size-3.5" />
            <span className="font-medium">
              {formatDuration(totals.duration)}
            </span>
          </div>
          <Separator
            orientation="vertical"
            className="data-[orientation=vertical]:h-3"
          />
          <span>
            {route.segments.length} segment{route.segments.length !== 1 && "en"}
          </span>
        </div>

        {/* Step content */}
        <div className="min-h-[260px]">
          {step === 0 && <TechniquesStep route={route} store={store} />}
          {step === 1 && (
            <ExportStep route={route} store={store} canGenerate={canGenerate} />
          )}
        </div>

        {/* Footer with dot indicators + navigation */}
        <DialogFooter className="sm:justify-between">
          <div className="flex items-center gap-1.5">
            {STEPS.map((_, i) => (
              <button
                key={i}
                className={`size-2 rounded-full transition-colors ${
                  i === step ? "bg-primary" : "bg-muted-foreground/30"
                }`}
                onClick={() => setStep(i)}
              />
            ))}
          </div>
          <div className="flex items-center gap-2">
            {step > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setStep(step - 1)}
              >
                <ArrowLeftIcon />
                Vorige
              </Button>
            )}
            {step < STEPS.length - 1 ? (
              <Button size="sm" onClick={() => setStep(step + 1)}>
                Volgende
                <ArrowRightIcon />
              </Button>
            ) : (
              <Button size="sm" onClick={() => handleClose(false)}>
                <CheckIcon />
                Klaar
              </Button>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ── Step 1: Technique assignment per segment ─────────────
function TechniquesStep({
  route,
  store,
}: {
  route: Route
  store: ProjectStore
}) {
  if (route.segments.length === 0) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-2 py-12 text-center">
        <CompassIcon className="size-10 text-muted-foreground/40" />
        <p className="text-sm text-muted-foreground">
          Plaats minimaal 2 punten om segmenten te maken.
        </p>
      </div>
    )
  }

  return (
    <ScrollArea className="h-[260px]">
      <div className="flex flex-col gap-3 pr-3">
        {route.segments.map((seg) => (
          <div key={seg.id} className="rounded-lg border border-border/60 p-3">
            <div className="mb-2 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div
                  className="size-2.5 rounded-full"
                  style={{ backgroundColor: TECHNIQUE_COLORS[seg.technique] }}
                />
                <span className="text-sm font-medium">
                  Punt {seg.fromIndex + 1} → {seg.toIndex + 1}
                </span>
              </div>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                {seg.distance > 0 && (
                  <span className="flex items-center gap-1">
                    <FootprintsIcon className="size-3" />
                    {formatDistance(seg.distance)}
                  </span>
                )}
                {seg.duration > 0 && (
                  <span className="flex items-center gap-1">
                    <ClockIcon className="size-3" />
                    {formatDuration(seg.duration)}
                  </span>
                )}
              </div>
            </div>
            <Select
              value={seg.technique}
              onValueChange={(val: string) =>
                store.setSegmentTechnique(seg.id, val as TechniqueType)
              }
            >
              <SelectTrigger className="h-9 text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ALL_TECHNIQUE_TYPES.map((type) => (
                  <SelectItem key={type} value={type}>
                    <div className="flex items-center gap-2">
                      <div
                        className="size-2.5 shrink-0 rounded-full"
                        style={{ backgroundColor: TECHNIQUE_COLORS[type] }}
                      />
                      <span>{TECHNIQUE_META[type].label}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Textarea
              placeholder="Beschrijving / notitie..."
              className="mt-2 min-h-[52px] resize-none text-sm"
              value={seg.description}
              onChange={(e) =>
                store.setSegmentDescription(seg.id, e.target.value)
              }
            />
          </div>
        ))}
      </div>
    </ScrollArea>
  )
}

// ── Step 2: Generate & Export ─────────────────────────────
function ExportStep({
  route,
  store,
  canGenerate,
}: {
  route: Route
  store: ProjectStore
  canGenerate: boolean
}) {
  return (
    <div className="flex h-[260px] flex-col items-center justify-center gap-5">
      {/* Technique summary badges */}
      <div className="flex flex-wrap justify-center gap-1.5">
        {route.segments.map((seg) => (
          <Badge
            key={seg.id}
            variant="secondary"
            className="gap-1.5 px-2 py-0.5 text-xs"
          >
            <div
              className="size-2 rounded-full"
              style={{ backgroundColor: TECHNIQUE_COLORS[seg.technique] }}
            />
            Seg {seg.fromIndex + 1}→{seg.toIndex + 1}:{" "}
            {TECHNIQUE_META[seg.technique].label}
          </Badge>
        ))}
      </div>

      {/* Generate */}
      <Button
        className="w-full max-w-xs"
        variant={route.techniqueOutputs.length > 0 ? "secondary" : "default"}
        onClick={() => {
          const outputs = generateTechniques(route)
          store.setTechniqueOutputs(route.id, outputs)
        }}
        disabled={!canGenerate}
      >
        {store.isLoadingDirections ? (
          <Loader2Icon className="animate-spin" />
        ) : (
          <SparklesIcon />
        )}
        Genereer technieken
      </Button>

      {/* Download */}
      {route.techniqueOutputs.length > 0 && (
        <>
          <p className="text-sm text-muted-foreground">
            {route.techniqueOutputs.length} techniek
            {route.techniqueOutputs.length !== 1 && "en"} gegenereerd.
          </p>
          <Button
            className="w-full max-w-xs"
            onClick={() => exportRouteAsZip(route)}
          >
            <DownloadIcon />
            Download als ZIP
          </Button>
        </>
      )}

      {!canGenerate && route.segments.length > 0 && (
        <p className="max-w-xs text-center text-xs text-muted-foreground">
          Wacht tot alle routegegevens geladen zijn voordat je genereert.
        </p>
      )}
    </div>
  )
}
