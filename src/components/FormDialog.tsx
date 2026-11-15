import * as Dialog from '@radix-ui/react-dialog'
import { X } from 'lucide-react'
import type { ReactNode } from 'react'
import { Button } from './ui/button'
import { useFocusReturn } from '@/lib/useFocusReturn'

/**
 * A popup for a short form. Radix traps focus, closes on Esc and puts focus back afterwards.
 * Put the form inside; it is created fresh each time the popup opens.
 */
export function FormDialog({
  open,
  onOpenChange,
  title,
  description,
  children,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description?: string
  children: ReactNode
}) {
  const focusReturn = useFocusReturn()

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-foreground/45 backdrop-blur-[2px]" />
        <Dialog.Content
          {...focusReturn}
          className="fixed left-1/2 top-1/2 z-50 max-h-[calc(100vh-2rem)] w-[calc(100%-2rem)] max-w-md -translate-x-1/2 -translate-y-1/2 overflow-y-auto overscroll-contain rounded-xl border border-border bg-surface p-6 shadow-2xl"
        >
          <div className="mb-5 flex items-start justify-between gap-4 border-b border-border/70 pb-4">
            <div>
              <Dialog.Title className="text-base font-semibold tracking-tight text-foreground">
                {title}
              </Dialog.Title>
              {description ? (
                <Dialog.Description className="mt-1 text-sm text-muted-foreground">
                  {description}
                </Dialog.Description>
              ) : (
                <Dialog.Description className="sr-only">{title}</Dialog.Description>
              )}
            </div>
            <Dialog.Close asChild>
              <Button variant="ghost" size="icon" aria-label="Close">
                <X className="size-4" aria-hidden />
              </Button>
            </Dialog.Close>
          </div>
          {open && children}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
