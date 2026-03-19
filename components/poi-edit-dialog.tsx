"use client"

import { useState, useEffect, lazy, Suspense, type ComponentProps } from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { useConfirm } from "@/components/confirm-dialog"
import type { Emoji } from "frimousse"

// Lazy-load the heavy emoji picker — only fetched when the popover opens
const LazyEmojiPickerInner = lazy(() =>
  import("frimousse").then((mod) => ({
    default: function EmojiPickerInner({
      onSelect,
    }: {
      onSelect: (emoji: string) => void
    }) {
      const { EmojiPicker } = mod

      return (
        <EmojiPicker.Root
          onEmojiSelect={(e: Emoji) => onSelect(e.emoji)}
          className="flex h-[320px] w-[300px] flex-col"
          columns={8}
        >
          <EmojiPicker.Search
            autoFocus
            className="mx-2 mt-2 h-8 w-[calc(100%-16px)] rounded-md border bg-background px-2 text-sm outline-none placeholder:text-muted-foreground"
            placeholder="Zoek emoji..."
          />
          <EmojiPicker.Viewport className="min-h-0 flex-1">
            <EmojiPicker.Loading className="flex h-full items-center justify-center text-sm text-muted-foreground">
              Laden...
            </EmojiPicker.Loading>
            <EmojiPicker.Empty className="flex h-full items-center justify-center text-sm text-muted-foreground">
              Geen emoji gevonden.
            </EmojiPicker.Empty>
            <EmojiPicker.List
              className="px-1 select-none"
              components={{
                CategoryHeader: ({
                  category,
                  ...props
                }: Omit<ComponentProps<"div">, "children"> & {
                  category: { label: string }
                }) => (
                  <div
                    className="sticky top-0 bg-popover px-1 py-1 text-[11px] font-medium text-muted-foreground"
                    {...props}
                  >
                    {category.label}
                  </div>
                ),
                Emoji: ({
                  emoji,
                  ...props
                }: ComponentProps<"button"> & {
                  emoji: Emoji & { isActive: boolean }
                }) => (
                  <button
                    type="button"
                    className={`flex size-8 cursor-pointer items-center justify-center rounded text-lg transition-colors ${emoji.isActive ? "bg-accent" : "hover:bg-accent/50"}`}
                    {...props}
                  >
                    {emoji.emoji}
                  </button>
                ),
              }}
            />
          </EmojiPicker.Viewport>
        </EmojiPicker.Root>
      )
    },
  }))
)

interface PoiEditDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  initialEmoji?: string
  initialName?: string
  initialNote?: string
  onSave: (emoji: string, name: string, note: string) => void
  onDelete?: () => void
}

export function PoiEditDialog({
  open,
  onOpenChange,
  initialEmoji = "📍",
  initialName = "",
  initialNote = "",
  onSave,
  onDelete,
}: PoiEditDialogProps) {
  const [emoji, setEmoji] = useState(initialEmoji)
  const [name, setName] = useState(initialName)
  const [note, setNote] = useState(initialNote)
  const [pickerOpen, setPickerOpen] = useState(false)
  const confirm = useConfirm()

  useEffect(() => {
    if (open) {
      setEmoji(initialEmoji)
      setName(initialName)
      setNote(initialNote)
      setPickerOpen(false)
    }
  }, [open, initialEmoji, initialName, initialNote])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>POI bewerken</DialogTitle>
          <DialogDescription>
            Kies een icoon en voeg een beschrijving toe.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-3 py-1">
          {/* Emoji + Name on one row */}
          <div className="flex items-end gap-2">
            <div className="space-y-1.5">
              <Label>Icoon</Label>
              <Popover open={pickerOpen} onOpenChange={setPickerOpen}>
                <PopoverTrigger asChild>
                  <button
                    type="button"
                    className="flex h-8 w-8 items-center justify-center rounded-lg border bg-muted text-lg transition-colors hover:bg-accent"
                  >
                    {emoji}
                  </button>
                </PopoverTrigger>
                <PopoverContent
                  side="bottom"
                  align="start"
                  className="w-auto p-0"
                  onOpenAutoFocus={(e) => e.preventDefault()}
                >
                  <Suspense
                    fallback={
                      <div className="flex h-[320px] w-[300px] items-center justify-center text-sm text-muted-foreground">
                        Laden...
                      </div>
                    }
                  >
                    <LazyEmojiPickerInner
                      onSelect={(e) => {
                        setEmoji(e)
                        setPickerOpen(false)
                      }}
                    />
                  </Suspense>
                </PopoverContent>
              </Popover>
            </div>
            <div className="flex-1 space-y-1.5">
              <Label htmlFor="poi-name">Naam</Label>
              <Input
                id="poi-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Bijv. Drinkwaterpunt"
              />
            </div>
          </div>

          {/* Note / description */}
          <div className="space-y-1.5">
            <Label htmlFor="poi-note">Beschrijving</Label>
            <Textarea
              id="poi-note"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Optionele toelichting..."
              rows={2}
            />
          </div>
        </div>

        <DialogFooter>
          {onDelete && (
            <Button
              variant="ghost"
              size="sm"
              onClick={async () => {
                const ok = await confirm({
                  title: "POI verwijderen?",
                  description: "Dit punt wordt permanent verwijderd.",
                  confirmLabel: "Verwijderen",
                  variant: "destructive",
                })
                if (!ok) return
                onDelete()
                onOpenChange(false)
              }}
              className="mr-auto text-muted-foreground"
            >
              Verwijderen
            </Button>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={() => onOpenChange(false)}
          >
            Annuleren
          </Button>
          <Button
            size="sm"
            onClick={() => {
              onSave(emoji, name, note)
              onOpenChange(false)
            }}
          >
            Opslaan
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
