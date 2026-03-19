"use client"

import { SiteHeader } from "@/components/site-header"
import { RouteMap } from "@/components/hike-map"
import { ProjectPanel } from "@/components/project-panel"
import { useProjectStore } from "@/hooks/use-project-store"
import { ConfirmDialogProvider } from "@/components/confirm-dialog"

export default function Page() {
  const store = useProjectStore()

  return (
    <ConfirmDialogProvider>
      <div className="flex h-dvh flex-col">
        <SiteHeader store={store} />
        <div className="relative flex-1 overflow-hidden rounded-t-3xl">
          <RouteMap store={store} />
          <ProjectPanel store={store} />
        </div>
      </div>
    </ConfirmDialogProvider>
  )
}
