"use client"

import { useMemo } from "react"
import { Area, AreaChart } from "recharts"
import type { Route } from "@/lib/types"
import { getRouteElevationProfile } from "@/lib/elevation"
import {
  ChartContainer,
  ChartTooltip,
  type ChartConfig,
} from "@/components/ui/chart"
import {
  ArrowUpIcon,
  ArrowDownIcon,
  MountainIcon,
  RulerIcon,
  ClockIcon,
} from "lucide-react"

interface ElevationProfileProps {
  route: Route
}

const chartConfig = {
  elevation: { label: "Hoogte", color: "var(--chart-1)" },
} satisfies ChartConfig

function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600)
  const m = Math.round((seconds % 3600) / 60)
  if (h === 0) return `${m}min`
  return m > 0 ? `${h}u ${m}min` : `${h}u`
}

export function ElevationProfile({ route }: ElevationProfileProps) {
  const profileData = useMemo(() => getRouteElevationProfile(route), [route])

  const { points, stats, colorStops } = profileData

  // Route totals from segments
  const totalDistance = useMemo(
    () => route.segments.reduce((s, seg) => s + seg.distance, 0),
    [route]
  )
  const totalDuration = useMemo(
    () => route.segments.reduce((s, seg) => s + seg.duration, 0),
    [route]
  )

  // Down-sample to at most ~200 points for chart perf
  const chartPoints = useMemo(() => {
    if (points.length <= 200) return points
    const step = Math.ceil(points.length / 200)
    return points.filter((_, i) => i % step === 0 || i === points.length - 1)
  }, [points])

  // Recharts data — distance in km, elevation in m
  const data = useMemo(
    () =>
      chartPoints.map((p) => ({
        distance: +(p.distance / 1000).toFixed(2),
        elevation: Math.round(p.elevation),
      })),
    [chartPoints]
  )

  if (data.length < 2 || !stats) return null

  // Build unique gradient ids
  const gradId = `ele-gradient-${route.id.slice(0, 8)}`
  const gradFillId = `ele-fill-${route.id.slice(0, 8)}`

  return (
    <div className="flex flex-col gap-2">
      {/* Stats row */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
        <span className="flex items-center gap-1">
          <RulerIcon className="size-3" />
          <span className="font-medium text-foreground">
            {(totalDistance / 1000).toFixed(1)} km
          </span>
        </span>
        <span className="flex items-center gap-1">
          <ClockIcon className="size-3" />
          <span className="font-medium text-foreground">
            {formatDuration(totalDuration)}
          </span>
        </span>
        <span className="flex items-center gap-1">
          <ArrowUpIcon className="size-3 text-green-500" />
          <span className="font-medium text-foreground">{stats.ascent}m</span>
        </span>
        <span className="flex items-center gap-1">
          <ArrowDownIcon className="size-3 text-red-500" />
          <span className="font-medium text-foreground">{stats.descent}m</span>
        </span>
        <span className="flex items-center gap-1">
          <MountainIcon className="size-3" />
          {stats.minElevation}m – {stats.maxElevation}m
        </span>
      </div>

      {/* Area chart — no axes, no legend, single-color tooltip dot */}
      <ChartContainer config={chartConfig} className="h-20 w-full overflow-hidden rounded-lg">
        <AreaChart
          data={data}
          margin={{ left: 0, right: 0, top: 2, bottom: 0 }}
        >
          <defs>
            {/* Horizontal stroke gradient — multi-color per segment */}
            <linearGradient id={gradId} x1="0" y1="0" x2="1" y2="0">
              {colorStops.map((stop, i) => (
                <stop
                  key={i}
                  offset={`${(stop.offset * 100).toFixed(1)}%`}
                  stopColor={stop.color}
                />
              ))}
            </linearGradient>
            {/* Same horizontal gradient for the fill area */}
            <linearGradient id={gradFillId} x1="0" y1="0" x2="1" y2="0">
              {colorStops.map((stop, i) => (
                <stop
                  key={i}
                  offset={`${(stop.offset * 100).toFixed(1)}%`}
                  stopColor={stop.color}
                  stopOpacity={0.3}
                />
              ))}
            </linearGradient>
          </defs>
          <ChartTooltip
            cursor={{ stroke: "var(--border)", strokeDasharray: "3 3" }}
            content={({ active, payload }) => {
              if (!active || !payload?.length) return null
              const d = payload[0].payload as { distance: number; elevation: number }
              return (
                <div className="rounded-md border bg-background px-2.5 py-1.5 text-xs shadow-sm">
                  <span className="font-medium">{d.elevation}m</span>
                  <span className="ml-1.5 text-muted-foreground">
                    @ {d.distance} km
                  </span>
                </div>
              )
            }}
          />
          <Area
            dataKey="elevation"
            type="monotone"
            stroke={`url(#${gradId})`}
            strokeWidth={2}
            fill={`url(#${gradFillId})`}
            fillOpacity={1}
            activeDot={{ r: 3, fill: "var(--foreground)", stroke: "var(--background)", strokeWidth: 2 }}
          />
        </AreaChart>
      </ChartContainer>
    </div>
  )
}
