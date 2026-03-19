"use client"

import { useState, useCallback } from "react"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarInput,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar"
import { Button } from "@/components/ui/button"
import {
  CompassIcon,
  PlusIcon,
  Trash2Icon,
  FolderIcon,
  MapPinPlusIcon,
  ArrowLeftIcon,
} from "lucide-react"
import type { ProjectStore } from "@/hooks/use-project-store"
import { TECHNIQUE_COLORS, TECHNIQUE_META } from "@/lib/types"
import { cn } from "@/lib/utils"
import { toast } from "sonner"

interface AppSidebarProps extends React.ComponentProps<typeof Sidebar> {
  store: ProjectStore
}

export function AppSidebar({ store, ...props }: AppSidebarProps) {
  const { setOpen } = useSidebar()
  const [newProjectName, setNewProjectName] = useState("")
  const [newRouteName, setNewRouteName] = useState("")

  const project = store.activeProject

  const handleCreateProject = useCallback(() => {
    const name = newProjectName.trim()
    if (!name) return
    store.createProject(name)
    setNewProjectName("")
  }, [newProjectName, store])

  const handleCreateRoute = useCallback(() => {
    const name = newRouteName.trim()
    if (!name) return
    store.createRoute(name)
    setNewRouteName("")
    toast.success(`Route "${name}" aangemaakt`, {
      description: "Klik op de kaart om punten te plaatsen.",
    })
  }, [newRouteName, store])

  return (
    <Sidebar
      collapsible="icon"
      className="overflow-hidden *:data-[sidebar=sidebar]:flex-row"
      {...props}
    >
      {/* ── Icon rail (left) ─────────────────────────── */}
      <Sidebar
        collapsible="none"
        className="w-[calc(var(--sidebar-width-icon)+1px)]! border-r"
      >
        <SidebarHeader>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton size="lg" asChild className="md:h-8 md:p-0">
                <button
                  onClick={() => {
                    store.goHome()
                    setOpen(true)
                  }}
                >
                  <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
                    <CompassIcon className="size-4" />
                  </div>
                  <div className="grid flex-1 text-left text-sm leading-tight">
                    <span className="truncate font-medium">OpenHike</span>
                    <span className="truncate text-xs">Routetechnieken</span>
                  </div>
                </button>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarHeader>
        <SidebarContent>
          <SidebarGroup>
            <SidebarGroupContent className="px-1.5 md:px-0">
              <SidebarMenu>
                {store.projects.map((p) => (
                  <SidebarMenuItem key={p.id}>
                    <SidebarMenuButton
                      tooltip={{ children: p.name, hidden: false }}
                      onClick={() => {
                        store.openProject(p.id)
                        setOpen(true)
                      }}
                      isActive={project?.id === p.id}
                      className="px-2.5 md:px-2"
                    >
                      <FolderIcon />
                      <span>{p.name}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
                <SidebarMenuItem>
                  <SidebarMenuButton
                    tooltip={{ children: "Nieuw project", hidden: false }}
                    onClick={() => {
                      store.goHome()
                      setOpen(true)
                    }}
                    className="px-2.5 md:px-2"
                  >
                    <PlusIcon />
                    <span>Nieuw</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>
        <SidebarFooter />
      </Sidebar>

      {/* ── Content panel (right) ────────────────────── */}
      <Sidebar collapsible="none" className="hidden flex-1 md:flex">
        {project ? (
          /* ── Project view ── */
          <>
            <SidebarHeader className="gap-3.5 border-b p-4">
              <div className="flex w-full items-center justify-between">
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => store.goHome()}
                    className="rounded-md p-1 hover:bg-sidebar-accent"
                  >
                    <ArrowLeftIcon className="size-4" />
                  </button>
                  <span className="truncate text-base font-medium text-foreground">
                    {project.name}
                  </span>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-7 text-muted-foreground hover:text-destructive"
                  onClick={() => store.deleteProject(project.id)}
                >
                  <Trash2Icon className="size-3.5" />
                </Button>
              </div>
              <form
                onSubmit={(e) => {
                  e.preventDefault()
                  handleCreateRoute()
                }}
                className="flex items-center gap-2"
              >
                <SidebarInput
                  placeholder="Nieuwe route..."
                  value={newRouteName}
                  onChange={(e) => setNewRouteName(e.target.value)}
                />
                <Button
                  type="submit"
                  size="icon"
                  variant="ghost"
                  className="size-7 shrink-0"
                  disabled={!newRouteName.trim()}
                >
                  <PlusIcon className="size-4" />
                </Button>
              </form>
            </SidebarHeader>
            <SidebarContent>
              <SidebarGroup className="px-0">
                <SidebarGroupContent>
                  {project.routes.length === 0 ? (
                    <div className="flex flex-col items-center gap-2 p-8 text-center">
                      <MapPinPlusIcon className="size-8 text-muted-foreground/40" />
                      <p className="text-sm text-muted-foreground">
                        Nog geen routes. Maak er een aan.
                      </p>
                    </div>
                  ) : (
                    project.routes.map((r) => {
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
                            "flex w-full cursor-pointer items-center gap-2.5 border-b px-4 py-2.5 text-sm transition-colors last:border-b-0",
                            isActive
                              ? "bg-sidebar-accent text-sidebar-accent-foreground"
                              : "hover:bg-sidebar-accent/50"
                          )}
                          onClick={() =>
                            store.selectRoute(isActive ? null : r.id)
                          }
                        >
                          <div
                            className="size-2.5 shrink-0 rounded-full"
                            style={{ backgroundColor: r.color }}
                          />
                          <span className="truncate font-medium">{r.name}</span>
                          {uniqueTechniques.length > 0 && (
                            <div className="flex items-center gap-0.5">
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
                          <span className="ml-auto text-xs whitespace-nowrap text-muted-foreground">
                            {totalDist > 0
                              ? totalDist < 1000
                                ? `${Math.round(totalDist)}m`
                                : `${(totalDist / 1000).toFixed(1)} km`
                              : `${r.waypoints.length} pt`}
                          </span>
                        </button>
                      )
                    })
                  )}
                </SidebarGroupContent>
              </SidebarGroup>
            </SidebarContent>
          </>
        ) : (
          /* ── Home view ── */
          <>
            <SidebarHeader className="gap-3.5 border-b p-4">
              <div className="text-base font-medium text-foreground">
                Projecten
              </div>
              <form
                onSubmit={(e) => {
                  e.preventDefault()
                  handleCreateProject()
                }}
              >
                <SidebarInput
                  placeholder="Nieuw project..."
                  value={newProjectName}
                  onChange={(e) => setNewProjectName(e.target.value)}
                />
              </form>
            </SidebarHeader>
            <SidebarContent>
              <SidebarGroup className="px-0">
                <SidebarGroupContent>
                  {store.projects.length === 0 ? (
                    <div className="flex flex-col items-center gap-3 p-8 text-center">
                      <CompassIcon className="size-10 text-muted-foreground/30" />
                      <p className="text-sm text-muted-foreground">
                        Welkom bij OpenHike.
                        <br />
                        Typ een naam hierboven.
                      </p>
                    </div>
                  ) : (
                    store.projects.map((p) => (
                      <button
                        key={p.id}
                        className="flex w-full flex-col items-start gap-1 border-b p-4 text-left text-sm transition-colors last:border-b-0 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                        onClick={() => store.openProject(p.id)}
                      >
                        <div className="flex w-full items-center gap-2">
                          <FolderIcon className="size-4 shrink-0 text-muted-foreground" />
                          <span className="truncate font-medium">{p.name}</span>
                          <span className="ml-auto text-xs text-muted-foreground">
                            {p.routes.length} route
                            {p.routes.length !== 1 ? "s" : ""}
                          </span>
                        </div>
                        <span className="text-xs text-muted-foreground">
                          {new Date(p.createdAt).toLocaleDateString("nl-NL")}
                        </span>
                      </button>
                    ))
                  )}
                </SidebarGroupContent>
              </SidebarGroup>
            </SidebarContent>
          </>
        )}
      </Sidebar>
    </Sidebar>
  )
}
