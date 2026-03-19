// ── Geo ──────────────────────────────────────────────────
export interface LatLng {
  lat: number
  lng: number
}

// ── Project ──────────────────────────────────────────────
export interface Project {
  id: string
  name: string
  routes: Route[]
  createdAt: number
}

// ── Route ────────────────────────────────────────────────
export interface Waypoint {
  id: string
  position: LatLng
  label?: string
  /** Ghost waypoints are via-points added by dragging the route line — not shown as numbered points and excluded from technique generation */
  ghost?: boolean
}

export interface SideStreet {
  bearing: number
  name?: string
}

export interface Intersection {
  position: LatLng
  bearing: number
  sideStreets: SideStreet[]
  streetName?: string
}

/** A segment connects two consecutive waypoints */
export interface Segment {
  id: string
  fromIndex: number
  toIndex: number
  technique: TechniqueType
  description: string
  path: LatLng[]
  intersections: Intersection[]
  legDistances: number[]
  legBearings: number[]
  distance: number
  duration: number
}

export interface Route {
  id: string
  name: string
  waypoints: Waypoint[]
  segments: Segment[]
  /** Generated technique outputs (one per segment) */
  techniqueOutputs: TechniqueOutput[]
  color: string
}

// ── Routetechnieken ──────────────────────────────────────
export type TechniqueType =
  | "bolletje-pijltje"
  | "kruispuntenroute"
  | "stripkaart"
  | "coordinatenroute"
  | "kompasroute"
  | "vectorroute"
  | "helikopterroute"
  | "oleaat"
  | "vliegkoers"

export interface TechniqueOutput {
  type: TechniqueType
  label: string
  svgContent: string
  segmentIndex: number
}

export const TECHNIQUE_META: Record<
  TechniqueType,
  { label: string; description: string }
> = {
  "bolletje-pijltje": {
    label: "Bolletje-pijltje",
    description:
      "Bij elk kruispunt een bolletje met een pijltje dat de looprichting aangeeft.",
  },
  kruispuntenroute: {
    label: "Kruispuntenroute",
    description:
      "Elk kruispunt getekend met alle zijstraten en een pijl in de looprichting.",
  },
  stripkaart: {
    label: "Stripkaart",
    description:
      "Verticale strip met de route als lijn en zijstraten als visgraat.",
  },
  coordinatenroute: {
    label: "Coördinatenroute",
    description: "Lijst met coördinaten van elk routepunt.",
  },
  kompasroute: {
    label: "Kompasroute",
    description: "Kompasrichting en afstand tussen opeenvolgende punten.",
  },
  vectorroute: {
    label: "Vectorroute",
    description:
      "Richtingsverandering ten opzichte van de vorige looprichting.",
  },
  helikopterroute: {
    label: "Helikopterroute",
    description:
      "Alle routepunten als kompasrichting en afstand vanuit één centraal punt.",
  },
  oleaat: {
    label: "Oleaat",
    description: "Alleen de te volgen route getekend, zonder omgeving.",
  },
  vliegkoers: {
    label: "Vliegkoers",
    description:
      "Kompasrichting en afstand als rechte lijn van punt naar punt.",
  },
}

export const ALL_TECHNIQUE_TYPES = Object.keys(
  TECHNIQUE_META
) as TechniqueType[]

export const TECHNIQUE_COLORS: Record<TechniqueType, string> = {
  "bolletje-pijltje": "#3b82f6", // blue-500
  kruispuntenroute: "#ef4444", // red-500
  stripkaart: "#22c55e", // green-500
  coordinatenroute: "#a855f7", // purple-500
  kompasroute: "#f97316", // orange-500
  vectorroute: "#ec4899", // pink-500
  helikopterroute: "#06b6d4", // cyan-500
  oleaat: "#f59e0b", // amber-500
  vliegkoers: "#14b8a6", // teal-500
}

// ── App state ────────────────────────────────────────────
export type AppView = "home" | "project"
export type EditorMode = "idle" | "adding-waypoints"

export const ROUTE_COLORS = [
  "#2563eb",
  "#dc2626",
  "#16a34a",
  "#9333ea",
  "#ea580c",
  "#0891b2",
  "#be185d",
  "#854d0e",
]

/** Netherlands center (scouting context) */
export const DEFAULT_CENTER: LatLng = { lat: 52.09, lng: 5.12 }
export const DEFAULT_ZOOM = 14
