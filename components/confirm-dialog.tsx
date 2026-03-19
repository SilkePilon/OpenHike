"use client"

import { useState, useCallback, createContext, useContext, useRef } from "react"
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
} from "@/components/ui/alert-dialog"

interface ConfirmOptions {
  title: string
  description?: string
  confirmLabel?: string
  cancelLabel?: string
  variant?: "destructive" | "default"
}

type ConfirmFn = (options: ConfirmOptions) => Promise<boolean>

const ConfirmContext = createContext<ConfirmFn | null>(null)

export function useConfirm(): ConfirmFn {
  const fn = useContext(ConfirmContext)
  if (!fn)
    throw new Error("useConfirm must be used within <ConfirmDialogProvider>")
  return fn
}

export function ConfirmDialogProvider({
  children,
}: {
  children: React.ReactNode
}) {
  const [open, setOpen] = useState(false)
  const [options, setOptions] = useState<ConfirmOptions>({
    title: "",
  })
  const resolveRef = useRef<((value: boolean) => void) | null>(null)

  const confirm = useCallback<ConfirmFn>((opts) => {
    setOptions(opts)
    setOpen(true)
    return new Promise<boolean>((resolve) => {
      resolveRef.current = resolve
    })
  }, [])

  const handleConfirm = useCallback(() => {
    setOpen(false)
    resolveRef.current?.(true)
    resolveRef.current = null
  }, [])

  const handleCancel = useCallback(() => {
    setOpen(false)
    resolveRef.current?.(false)
    resolveRef.current = null
  }, [])

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      <AlertDialog
        open={open}
        onOpenChange={(o) => {
          if (!o) handleCancel()
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{options.title}</AlertDialogTitle>
            {options.description && (
              <AlertDialogDescription>
                {options.description}
              </AlertDialogDescription>
            )}
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={handleCancel}>
              {options.cancelLabel ?? "Annuleren"}
            </AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirm}>
              {options.confirmLabel ?? "Bevestigen"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </ConfirmContext.Provider>
  )
}
