import type { Route } from "@/lib/types"

/**
 * Download all technique SVGs as individual files in a ZIP.
 * Uses dynamic import so JSZip is only loaded when exporting.
 */
export async function exportRouteAsZip(route: Route): Promise<void> {
  if (route.techniqueOutputs.length === 0) return

  // Dynamically import JSZip to keep initial bundle small
  const { default: JSZip } = await import("jszip")
  const zip = new JSZip()

  const folder = zip.folder(route.name) ?? zip

  for (const output of route.techniqueOutputs) {
    const filename = `${output.segmentIndex + 1}_${output.label.replace(/[^a-zA-Z0-9-]/g, "_")}.svg`
    folder.file(filename, output.svgContent)
  }

  const blob = await zip.generateAsync({ type: "blob" })
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = `${route.name}.zip`
  a.click()
  URL.revokeObjectURL(url)
}
