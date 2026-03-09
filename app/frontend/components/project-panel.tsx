"use client"

import { useState, useCallback, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Field, FieldGroup } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import {
  ChevronRightIcon,
  ChevronLeftIcon,
  FolderIcon,
  PlusIcon,
  Trash2Icon,
  ArrowLeftIcon,
  MapPinPlusIcon,
  CompassIcon,
} from "lucide-react"
import type { ProjectStore } from "@/hooks/use-project-store"
import { TECHNIQUE_COLORS, TECHNIQUE_META } from "@/lib/types"
import { cn } from "@/lib/utils"

interface ProjectPanelProps {
  store: ProjectStore
}

export function ProjectPanel({ store }: ProjectPanelProps) {
  const [open, setOpen] = useState(false)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [newName, setNewName] = useState("")

  const project = store.activeProject

  const lastProjectRef = useRef(project)
  useEffect(() => {
    if (project) lastProjectRef.current = project
  }, [project])
  const displayProject = project ?? lastProjectRef.current

  const handleCreate = useCallback(() => {
    const name = newName.trim()
    if (!name) return
    if (project) {
      store.createRoute(name)
    } else {
      store.createProject(name)
    }
    setNewName("")
    setDialogOpen(false)
  }, [newName, store, project])

  return (
    <div className="absolute top-1/2 left-0 z-10 -translate-y-1/2">
      {/* Outer shell — only transitions width & height */}
      <div
        className={cn(
          "relative overflow-hidden rounded-r-xl border border-l-0 bg-background shadow-lg will-change-[width,height]",
          open ? "h-96 w-64" : "h-9 w-9"
        )}
        style={{
          transition:
            "width 280ms cubic-bezier(0.32,0.72,0,1), height 280ms cubic-bezier(0.32,0.72,0,1)",
        }}
      >
        {/* Inner wrapper — fixed at expanded width so text doesn't reflow */}
        <div className="flex h-96 w-64 flex-col">
          {/* Chevron — always rendered, fades out when open */}
          <ChevronRightIcon
            className={cn(
              "absolute top-1/2 left-1/2 size-4 -translate-x-1/2 -translate-y-1/2 cursor-pointer text-muted-foreground",
              open ? "pointer-events-none opacity-0" : "opacity-100"
            )}
            style={{ transition: "opacity 150ms ease" }}
            onClick={() => setOpen(true)}
          />

          {/* Content — fades in when panel opens */}
          <div
            className={cn(
              "relative flex min-h-0 flex-1 flex-col overflow-hidden",
              open ? "opacity-100" : "pointer-events-none opacity-0"
            )}
            style={{ transition: "opacity 200ms ease 120ms" }}
          >
            {/* Home view (project list) */}
            <div
              className={cn(
                "absolute inset-0 flex flex-col",
                !project
                  ? "translate-x-0 opacity-100"
                  : "pointer-events-none -translate-x-3 opacity-0"
              )}
              style={{ transition: "transform 200ms ease, opacity 150ms ease" }}
            >
              <div className="flex shrink-0 items-center gap-2 px-3 pt-2.5 pb-2">
                <span className="text-sm font-medium">Projecten</span>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="ml-auto size-8"
                      onClick={() => setOpen(false)}
                    >
                      <ChevronLeftIcon />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="right">Sluiten</TooltipContent>
                </Tooltip>
              </div>

              <ScrollArea className="flex-1">
                {store.projects.length === 0 ? (
                  <div className="flex flex-col items-center gap-1.5 px-3 py-6 text-center">
                    <CompassIcon className="size-5 text-muted-foreground/30" />
                    <p className="text-xs text-muted-foreground">
                      Welkom bij OpenHike
                    </p>
                  </div>
                ) : (
                  <div className="flex flex-col py-1">
                    {store.projects.map((p) => (
                      <button
                        key={p.id}
                        className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-xs transition-colors hover:bg-accent/50"
                        onClick={() => store.openProject(p.id)}
                      >
                        <FolderIcon className="size-3.5 shrink-0 text-muted-foreground" />
                        <span className="truncate font-medium">{p.name}</span>
                        <span className="ml-auto text-[10px] whitespace-nowrap text-muted-foreground">
                          {p.routes.length} route
                          {p.routes.length !== 1 ? "s" : ""}
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </ScrollArea>

              {/* Footer */}
              <div className="shrink-0 rounded-br-xl border-t bg-muted/50 px-3 py-2">
                <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                  <DialogTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full gap-1.5 text-xs"
                    >
                      <PlusIcon className="size-3.5" />
                      Nieuw project
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-sm">
                    <form
                      onSubmit={(e) => {
                        e.preventDefault()
                        handleCreate()
                      }}
                    >
                      <DialogHeader>
                        <DialogTitle>Nieuw project</DialogTitle>
                        <DialogDescription>
                          Geef een naam voor het nieuwe project.
                        </DialogDescription>
                      </DialogHeader>
                      <FieldGroup className="pb-4">
                        <Field>
                          <Label htmlFor="create-name">Naam</Label>
                          <Input
                            id="create-name"
                            value={newName}
                            onChange={(e) => setNewName(e.target.value)}
                            placeholder="Project naam..."
                            autoFocus
                          />
                        </Field>
                      </FieldGroup>
                      <DialogFooter>
                        <DialogClose asChild>
                          <Button variant="outline">Annuleren</Button>
                        </DialogClose>
                        <Button type="submit" disabled={!newName.trim()}>
                          Aanmaken
                        </Button>
                      </DialogFooter>
                    </form>
                  </DialogContent>
                </Dialog>
              </div>
            </div>

            {/* Project view (route list) */}
            {displayProject && (
              <div
                className={cn(
                  "absolute inset-0 flex flex-col",
                  project
                    ? "translate-x-0 opacity-100"
                    : "pointer-events-none translate-x-3 opacity-0"
                )}
                style={{
                  transition: "transform 200ms ease, opacity 150ms ease",
                }}
              >
                <div className="flex shrink-0 items-center gap-2 px-3 pt-2.5 pb-2">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-8"
                        onClick={() => store.goHome()}
                      >
                        <ArrowLeftIcon />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent side="right">Terug</TooltipContent>
                  </Tooltip>
                  <span className="truncate text-sm font-medium">
                    {displayProject.name}
                  </span>
                  <div className="ml-auto flex items-center gap-0.5">
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="size-8"
                          onClick={() => store.deleteProject(displayProject.id)}
                        >
                          <Trash2Icon />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent side="right">
                        Project verwijderen
                      </TooltipContent>
                    </Tooltip>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="size-8"
                          onClick={() => setOpen(false)}
                        >
                          <ChevronLeftIcon />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent side="right">Sluiten</TooltipContent>
                    </Tooltip>
                  </div>
                </div>

                <ScrollArea className="flex-1">
                  {displayProject.routes.length === 0 ? (
                    <div className="flex flex-col items-center gap-1.5 px-3 py-6 text-center">
                      <MapPinPlusIcon className="size-5 text-muted-foreground/40" />
                      <p className="text-xs text-muted-foreground">
                        Nog geen routes
                      </p>
                    </div>
                  ) : (
                    <div className="flex flex-col py-1">
                      {displayProject.routes.map((r) => {
                        const isActive = r.id === store.activeRouteId
                        const totalDist = r.segments.reduce(
                          (s, seg) => s + seg.distance,
                          0
                        )
                        const uniqueTechniques = [
                          ...new Set(r.segments.map((s) => s.technique)),
                        ]

                        return (
                          <button
                            key={r.id}
                            className={cn(
                              "flex w-full items-center gap-2 px-3 py-1.5 text-left text-xs transition-colors",
                              isActive
                                ? "bg-accent text-accent-foreground"
                                : "hover:bg-accent/50"
                            )}
                            onClick={() => {
                              store.selectRoute(isActive ? null : r.id)
                              if (!isActive) setOpen(false)
                            }}
                          >
                            <div
                              className="size-2 shrink-0 rounded-full"
                              style={{ backgroundColor: r.color }}
                            />
                            <span className="truncate font-medium">
                              {r.name}
                            </span>
                            {uniqueTechniques.length > 0 && (
                              <div className="flex items-center gap-px">
                                {uniqueTechniques.map((t) => (
                                  <div
                                    key={t}
                                    className="size-1.5 rounded-full"
                                    style={{
                                      backgroundColor: TECHNIQUE_COLORS[t],
                                    }}
                                    title={TECHNIQUE_META[t].label}
                                  />
                                ))}
                              </div>
                            )}
                            <span className="ml-auto text-[10px] whitespace-nowrap text-muted-foreground">
                              {totalDist > 0
                                ? totalDist < 1000
                                  ? `${Math.round(totalDist)}m`
                                  : `${(totalDist / 1000).toFixed(1)} km`
                                : `${r.waypoints.length} pt`}
                            </span>
                          </button>
                        )
                      })}
                    </div>
                  )}
                </ScrollArea>

                {/* Footer */}
                <div className="shrink-0 rounded-br-xl border-t bg-muted/50 px-3 py-2">
                  <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                    <DialogTrigger asChild>
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full gap-1.5 text-xs"
                      >
                        <PlusIcon className="size-3.5" />
                        Nieuwe route
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-sm">
                      <form
                        onSubmit={(e) => {
                          e.preventDefault()
                          handleCreate()
                        }}
                      >
                        <DialogHeader>
                          <DialogTitle>Nieuwe route</DialogTitle>
                          <DialogDescription>
                            Geef een naam voor de nieuwe route.
                          </DialogDescription>
                        </DialogHeader>
                        <FieldGroup className="pb-4">
                          <Field>
                            <Label htmlFor="create-name">Naam</Label>
                            <Input
                              id="create-name"
                              value={newName}
                              onChange={(e) => setNewName(e.target.value)}
                              placeholder="Route naam..."
                              autoFocus
                            />
                          </Field>
                        </FieldGroup>
                        <DialogFooter>
                          <DialogClose asChild>
                            <Button variant="outline">Annuleren</Button>
                          </DialogClose>
                          <Button type="submit" disabled={!newName.trim()}>
                            Aanmaken
                          </Button>
                        </DialogFooter>
                      </form>
                    </DialogContent>
                  </Dialog>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
