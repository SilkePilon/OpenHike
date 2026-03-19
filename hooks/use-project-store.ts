"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import type {
  Project,
  Route,
  Waypoint,
  Segment,
  LatLng,
  AppView,
  EditorMode,
  TechniqueType,
  TechniqueOutput,
} from "@/lib/types"
import { ROUTE_COLORS, ALL_TECHNIQUE_TYPES } from "@/lib/types"

function uid() {
  return crypto.randomUUID()
}

const STORAGE_KEY = "openhike-data"

interface PersistedState {
  projects: Project[]
  activeProjectId: string | null
  activeRouteId: string | null
  view: AppView
}

function loadPersistedState(): PersistedState | null {
  if (typeof window === "undefined") return null
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    return JSON.parse(raw) as PersistedState
  } catch {
    return null
  }
}

export function useProjectStore() {
  const [projects, setProjects] = useState<Project[]>(() => {
    const saved = loadPersistedState()
    return saved?.projects ?? []
  })
  const [activeProjectId, setActiveProjectId] = useState<string | null>(() => {
    const saved = loadPersistedState()
    return saved?.activeProjectId ?? null
  })
  const [activeRouteId, setActiveRouteId] = useState<string | null>(() => {
    const saved = loadPersistedState()
    return saved?.activeRouteId ?? null
  })
  const [view, setView] = useState<AppView>(() => {
    const saved = loadPersistedState()
    return saved?.view ?? "home"
  })
  const [editorMode, setEditorMode] = useState<EditorMode>("idle")
  const [isLoadingDirections, setIsLoadingDirections] = useState(false)

  const activeProject = useMemo(
    () => projects.find((p) => p.id === activeProjectId) ?? null,
    [projects, activeProjectId]
  )

  const activeRoute = useMemo(
    () => activeProject?.routes.find((r) => r.id === activeRouteId) ?? null,
    [activeProject, activeRouteId]
  )

  // ── Project CRUD ────────────────────────────────────────
  const createProject = useCallback((name: string) => {
    const project: Project = {
      id: uid(),
      name,
      routes: [],
      createdAt: Date.now(),
    }
    setProjects((prev) => [...prev, project])
    setActiveProjectId(project.id)
    setView("project")
    return project
  }, [])

  const openProject = useCallback((id: string) => {
    setActiveProjectId(id)
    setActiveRouteId(null)
    setEditorMode("idle")
    setView("project")
  }, [])

  const deleteProject = useCallback(
    (id: string) => {
      setProjects((prev) => prev.filter((p) => p.id !== id))
      if (activeProjectId === id) {
        setActiveProjectId(null)
        setActiveRouteId(null)
        setView("home")
      }
    },
    [activeProjectId]
  )

  const goHome = useCallback(() => {
    setView("home")
    setActiveProjectId(null)
    setActiveRouteId(null)
    setEditorMode("idle")
  }, [])

  // ── Route CRUD ──────────────────────────────────────────
  const updateProject = useCallback(
    (projectId: string, updater: (p: Project) => Project) => {
      setProjects((prev) =>
        prev.map((p) => (p.id === projectId ? updater(p) : p))
      )
    },
    []
  )

  const createRoute = useCallback(
    (name: string) => {
      if (!activeProjectId) return null
      const colorIdx = (activeProject?.routes.length ?? 0) % ROUTE_COLORS.length
      const route: Route = {
        id: uid(),
        name,
        waypoints: [],
        segments: [],
        techniqueOutputs: [],
        color: ROUTE_COLORS[colorIdx],
      }
      updateProject(activeProjectId, (p) => ({
        ...p,
        routes: [...p.routes, route],
      }))
      setActiveRouteId(route.id)
      setEditorMode("adding-waypoints")
      return route
    },
    [activeProjectId, activeProject, updateProject]
  )

  const deleteRoute = useCallback(
    (routeId: string) => {
      if (!activeProjectId) return
      updateProject(activeProjectId, (p) => ({
        ...p,
        routes: p.routes.filter((r) => r.id !== routeId),
      }))
      if (activeRouteId === routeId) {
        setActiveRouteId(null)
        setEditorMode("idle")
      }
    },
    [activeProjectId, activeRouteId, updateProject]
  )

  const selectRoute = useCallback((routeId: string | null) => {
    setActiveRouteId(routeId)
    setEditorMode("idle")
  }, [])

  const updateRoute = useCallback(
    (routeId: string, updater: (r: Route) => Route) => {
      if (!activeProjectId) return
      updateProject(activeProjectId, (p) => ({
        ...p,
        routes: p.routes.map((r) => (r.id === routeId ? updater(r) : r)),
      }))
    },
    [activeProjectId, updateProject]
  )

  // ── Waypoint + segment operations ───────────────────────
  const addWaypoint = useCallback(
    (position: LatLng) => {
      if (!activeRouteId) return
      const wp: Waypoint = { id: uid(), position }
      updateRoute(activeRouteId, (r) => {
        const newWaypoints = [...r.waypoints, wp]
        const newSegments = [...r.segments]
        // Auto-create segment when there's a previous waypoint
        if (newWaypoints.length >= 2) {
          const fromIdx = newWaypoints.length - 2
          const toIdx = newWaypoints.length - 1
          const techIdx = newSegments.length % ALL_TECHNIQUE_TYPES.length
          const seg: Segment = {
            id: uid(),
            fromIndex: fromIdx,
            toIndex: toIdx,
            technique: ALL_TECHNIQUE_TYPES[techIdx],
            description: "",
            path: [],
            intersections: [],
            legDistances: [],
            legBearings: [],
            distance: 0,
            duration: 0,
          }
          newSegments.push(seg)
        }
        return {
          ...r,
          waypoints: newWaypoints,
          segments: newSegments,
          techniqueOutputs: [],
        }
      })
    },
    [activeRouteId, updateRoute]
  )

  const moveWaypoint = useCallback(
    (waypointId: string, newPosition: LatLng) => {
      if (!activeRouteId) return
      updateRoute(activeRouteId, (r) => {
        const wpIdx = r.waypoints.findIndex((w) => w.id === waypointId)
        if (wpIdx === -1) return r
        return {
          ...r,
          waypoints: r.waypoints.map((w) =>
            w.id === waypointId ? { ...w, position: newPosition } : w
          ),
          segments: r.segments.map((s) =>
            s.fromIndex === wpIdx || s.toIndex === wpIdx
              ? {
                  ...s,
                  path: [],
                  distance: 0,
                  duration: 0,
                  intersections: [],
                  legDistances: [],
                  legBearings: [],
                }
              : s
          ),
          techniqueOutputs: [],
        }
      })
    },
    [activeRouteId, updateRoute]
  )

  const closeRouteToWaypoint = useCallback(
    (waypointId: string) => {
      if (!activeRouteId) return
      updateRoute(activeRouteId, (r) => {
        const targetIdx = r.waypoints.findIndex((w) => w.id === waypointId)
        if (targetIdx === -1 || r.waypoints.length < 2) return r
        const lastIdx = r.waypoints.length - 1
        if (targetIdx === lastIdx) return r

        const techIdx = r.segments.length % ALL_TECHNIQUE_TYPES.length
        const seg: Segment = {
          id: uid(),
          fromIndex: lastIdx,
          toIndex: targetIdx,
          technique: ALL_TECHNIQUE_TYPES[techIdx],
          description: "",
          path: [],
          intersections: [],
          legDistances: [],
          legBearings: [],
          distance: 0,
          duration: 0,
        }
        return {
          ...r,
          segments: [...r.segments, seg],
          techniqueOutputs: [],
        }
      })
      setEditorMode("idle")
    },
    [activeRouteId, updateRoute]
  )

  const clearWaypoints = useCallback(() => {
    if (!activeRouteId) return
    updateRoute(activeRouteId, (r) => ({
      ...r,
      waypoints: [],
      segments: [],
      techniqueOutputs: [],
    }))
  }, [activeRouteId, updateRoute])

  const removeWaypoint = useCallback(
    (waypointId: string) => {
      if (!activeRouteId) return
      updateRoute(activeRouteId, (r) => {
        const wpIdx = r.waypoints.findIndex((w) => w.id === waypointId)
        if (wpIdx === -1) return r

        const newWaypoints = r.waypoints.filter((w) => w.id !== waypointId)

        // Find segments that touch this waypoint
        const before = r.segments.find((s) => s.toIndex === wpIdx)
        const after = r.segments.find((s) => s.fromIndex === wpIdx)

        let newSegments: Segment[]
        if (before && after) {
          // Merge the two segments into one
          const merged: Segment = {
            id: uid(),
            fromIndex: before.fromIndex,
            toIndex: after.toIndex > wpIdx ? after.toIndex - 1 : after.toIndex,
            technique: before.technique,
            description: before.description,
            path: [],
            intersections: [],
            legDistances: [],
            legBearings: [],
            distance: 0,
            duration: 0,
          }
          newSegments = r.segments
            .filter((s) => s.id !== before.id && s.id !== after.id)
            .map((s) => ({
              ...s,
              fromIndex: s.fromIndex > wpIdx ? s.fromIndex - 1 : s.fromIndex,
              toIndex: s.toIndex > wpIdx ? s.toIndex - 1 : s.toIndex,
            }))
          newSegments.push(merged)
        } else {
          // Edge waypoint — just remove the touching segment
          const touchingSeg = before || after
          newSegments = r.segments
            .filter((s) => s.id !== touchingSeg?.id)
            .map((s) => ({
              ...s,
              fromIndex: s.fromIndex > wpIdx ? s.fromIndex - 1 : s.fromIndex,
              toIndex: s.toIndex > wpIdx ? s.toIndex - 1 : s.toIndex,
            }))
        }

        return {
          ...r,
          waypoints: newWaypoints,
          segments: newSegments,
          techniqueOutputs: [],
        }
      })
    },
    [activeRouteId, updateRoute]
  )

  const insertWaypoint = useCallback(
    (segmentId: string, position: LatLng) => {
      if (!activeRouteId) return
      updateRoute(activeRouteId, (r) => {
        const segIdx = r.segments.findIndex((s) => s.id === segmentId)
        if (segIdx === -1) return r
        const seg = r.segments[segIdx]

        // Insert the new waypoint after the segment's fromIndex
        const insertIdx = seg.fromIndex + 1
        const newWp: Waypoint = { id: uid(), position, ghost: true }
        const newWaypoints = [
          ...r.waypoints.slice(0, insertIdx),
          newWp,
          ...r.waypoints.slice(insertIdx),
        ]

        // Build two new empty segments to replace the old one
        const segA: Segment = {
          id: uid(),
          fromIndex: seg.fromIndex,
          toIndex: insertIdx,
          technique: seg.technique,
          description: "",
          path: [],
          intersections: [],
          legDistances: [],
          legBearings: [],
          distance: 0,
          duration: 0,
        }
        const segB: Segment = {
          id: uid(),
          fromIndex: insertIdx,
          toIndex: seg.toIndex >= insertIdx ? seg.toIndex + 1 : seg.toIndex,
          technique: seg.technique,
          description: seg.description,
          path: [],
          intersections: [],
          legDistances: [],
          legBearings: [],
          distance: 0,
          duration: 0,
        }

        // Shift indices of all segments that reference waypoints after the insertion point
        const newSegments = r.segments.flatMap((s, i) => {
          if (i === segIdx) return [segA, segB]
          return [
            {
              ...s,
              fromIndex:
                s.fromIndex >= insertIdx ? s.fromIndex + 1 : s.fromIndex,
              toIndex: s.toIndex >= insertIdx ? s.toIndex + 1 : s.toIndex,
            },
          ]
        })

        return {
          ...r,
          waypoints: newWaypoints,
          segments: newSegments,
          techniqueOutputs: [],
        }
      })
    },
    [activeRouteId, updateRoute]
  )

  // ── Segment directions data ─────────────────────────────
  const setSegmentDirections = useCallback(
    (
      routeId: string,
      segmentId: string,
      data: {
        path: LatLng[]
        intersections: import("@/lib/types").Intersection[]
        legDistances: number[]
        legBearings: number[]
        distance: number
        duration: number
      }
    ) => {
      updateRoute(routeId, (r) => ({
        ...r,
        segments: r.segments.map((s) =>
          s.id === segmentId ? { ...s, ...data } : s
        ),
        techniqueOutputs: [],
      }))
    },
    [updateRoute]
  )

  // ── Technique per segment ───────────────────────────────
  const setSegmentTechnique = useCallback(
    (segmentId: string, technique: TechniqueType) => {
      if (!activeRouteId) return
      updateRoute(activeRouteId, (r) => ({
        ...r,
        segments: r.segments.map((s) =>
          s.id === segmentId ? { ...s, technique } : s
        ),
        techniqueOutputs: [],
      }))
    },
    [activeRouteId, updateRoute]
  )

  const setSegmentDescription = useCallback(
    (segmentId: string, description: string) => {
      if (!activeRouteId) return
      updateRoute(activeRouteId, (r) => ({
        ...r,
        segments: r.segments.map((s) =>
          s.id === segmentId ? { ...s, description } : s
        ),
      }))
    },
    [activeRouteId, updateRoute]
  )

  const setTechniqueOutputs = useCallback(
    (routeId: string, outputs: TechniqueOutput[]) => {
      updateRoute(routeId, (r) => ({ ...r, techniqueOutputs: outputs }))
    },
    [updateRoute]
  )

  // ── Persist to localStorage ────────────────────────────
  useEffect(() => {
    const data: PersistedState = {
      projects,
      activeProjectId,
      activeRouteId,
      view,
    }
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
    } catch {
      // storage full or unavailable — silently ignore
    }
  }, [projects, activeProjectId, activeRouteId, view])

  return {
    // State
    projects,
    activeProject,
    activeRoute,
    activeRouteId,
    view,
    editorMode,
    isLoadingDirections,
    // Project
    createProject,
    openProject,
    deleteProject,
    goHome,
    // Route
    createRoute,
    deleteRoute,
    selectRoute,
    updateRoute,
    // Waypoints
    addWaypoint,
    moveWaypoint,
    insertWaypoint,
    closeRouteToWaypoint,
    clearWaypoints,
    removeWaypoint,
    // Segment directions
    setSegmentDirections,
    setIsLoadingDirections,
    // Editor
    setEditorMode,
    // Techniques
    setSegmentTechnique,
    setSegmentDescription,
    setTechniqueOutputs,
  }
}

export type ProjectStore = ReturnType<typeof useProjectStore>
