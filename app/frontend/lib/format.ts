import type { Segment } from "@/lib/types"

export function formatDuration(seconds: number): string {
  if (seconds < 60) return `${seconds}s`
  const mins = Math.round(seconds / 60)
  if (mins < 60) return `${mins} min`
  const hrs = Math.floor(mins / 60)
  const rem = mins % 60
  return rem > 0 ? `${hrs}u ${rem}m` : `${hrs}u`
}

export function formatDistance(meters: number): string {
  if (meters < 1000) return `${Math.round(meters)}m`
  return `${(meters / 1000).toFixed(1)} km`
}

export function formatSegmentDuration(seg: Segment): string {
  if (seg.duration <= 0) return ""
  return formatDuration(seg.duration)
}

export function formatSegmentDistance(seg: Segment): string {
  if (seg.distance <= 0) return ""
  return formatDistance(seg.distance)
}
