import type {
  Route,
  Segment,
  TechniqueOutput,
  TechniqueType,
} from "@/lib/types"
import { TECHNIQUE_META } from "@/lib/types"

import { generate as bolletjePijltje } from "./bolletje-pijltje"
import { generate as kruispuntenroute } from "./kruispuntenroute"
import { generate as stripkaart } from "./stripkaart"
import { generate as coordinatenroute } from "./coordinatenroute"
import { generate as kompasroute } from "./kompasroute"
import { generate as vectorroute } from "./vectorroute"
import { generate as helikopterroute } from "./helikopterroute"
import { generate as oleaat } from "./oleaat"
import { generate as vliegkoers } from "./vliegkoers"

const generators: Record<TechniqueType, (segment: Segment) => string> = {
  "bolletje-pijltje": bolletjePijltje,
  kruispuntenroute,
  stripkaart,
  coordinatenroute,
  kompasroute,
  vectorroute,
  helikopterroute,
  oleaat,
  vliegkoers,
}

export function generateTechniques(route: Route): TechniqueOutput[] {
  return route.segments.map((seg, i) => {
    console.log(
      `[Technique] Segment ${i} (${seg.technique}):`,
      {
        intersections: seg.intersections.length,
        sideStreetCounts: seg.intersections.map(
          (ix, j) => `#${j}: ${ix.sideStreets.length} ss`
        ),
        legBearings: seg.legBearings,
        legDistances: seg.legDistances,
        pathLength: seg.path.length,
      }
    )
    return {
      type: seg.technique,
      label: TECHNIQUE_META[seg.technique].label,
      svgContent: generators[seg.technique](seg),
      segmentIndex: i,
    }
  })
}
