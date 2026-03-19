"use client"

import { useMemo } from "react"
import type { Route } from "@/lib/types"
import {
  getRouteElevationProfile,
  computeElevationStats,
} from "@/lib/elevation"
import { ArrowUpIcon, ArrowDownIcon, MountainIcon } from "lucide-react"

interface ElevationProfileProps {
  route: Route
}

export function ElevationProfile({ route }: ElevationProfileProps) {
  const profile = useMemo(() => getRouteElevationProfile(route), [route])
  const stats = useMemo(() => computeElevationStats(route), [route])

  if (profile.length < 2 || !stats) return null

  const totalDistance = profile[profile.length - 1].distance

  // Chart dimensions
  const W = 600
  const H = 80
  const PAD_X = 0
  const PAD_Y = 4

  const minEle = stats.minElevation
  const maxEle = stats.maxElevation
  const eleRange = Math.max(maxEle - minEle, 1) // prevent division by zero

  // Build SVG path
  const points = profile.map((p) => {
    const x = PAD_X + ((p.distance / totalDistance) * (W - 2 * PAD_X))
    const y = H - PAD_Y - ((p.elevation - minEle) / eleRange) * (H - 2 * PAD_Y)
    return `${x},${y}`
  })

  const linePath = `M${points.join("L")}`
  const areaPath = `${linePath}L${W - PAD_X},${H}L${PAD_X},${H}Z`

  return (
    <div className="flex flex-col gap-2">
      {/* Stats row */}
      <div className="flex items-center gap-4 text-xs text-muted-foreground">
        <span className="flex items-center gap-1">
          <ArrowUpIcon className="size-3 text-green-500" />
          <span className="font-medium text-foreground">{stats.ascent}m</span>
          stijging
        </span>
        <span className="flex items-center gap-1">
          <ArrowDownIcon className="size-3 text-red-500" />
          <span className="font-medium text-foreground">{stats.descent}m</span>
          daling
        </span>
        <span className="flex items-center gap-1">
          <MountainIcon className="size-3" />
          {stats.minElevation}m – {stats.maxElevation}m
        </span>
      </div>

      {/* Elevation chart */}
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="h-16 w-full rounded-md border bg-muted/30"
        preserveAspectRatio="none"
      >
        <defs>
          <linearGradient id="ele-fill" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="currentColor" stopOpacity="0.3" />
            <stop offset="100%" stopColor="currentColor" stopOpacity="0.05" />
          </linearGradient>
        </defs>
        <path d={areaPath} fill="url(#ele-fill)" className="text-primary" />
        <path
          d={linePath}
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          vectorEffect="non-scaling-stroke"
          className="text-primary"
        />
      </svg>
    </div>
  )
}
