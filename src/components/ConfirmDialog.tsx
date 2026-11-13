import * as Dialog from '@radix-ui/react-dialog'
import type { ReactNode } from 'react'
import { Button } from './ui/button'

/** "Are you sure?" popup. Radix traps focus, closes on Esc and restores focus afterwards. */
export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel = 'Confirm',
  destructive,
  pending,
  onConfirm,
  children,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description?: string
  confirmLabel?: string
  destructive?: boolean
  pending?: boolean
  onConfirm: () => void
  children?: ReactNode
}) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-foreground/40 backdrop-blur-[1px]" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-50 w-[calc(100%-2rem)] max-w-md -translate-x-1/2 -translate-y-1/2 rounded-lg border border-border bg-surface p-6 shadow-xl">
          <Dialog.Title className="text-base font-semibold">{title}</Dialog.Title>
          {description ? (
            <Dialog.Description className="mt-2 text-muted-foreground">
              {description}
            </Dialog.Description>
          ) : (
            <Dialog.Description className="sr-only">{title}</Dialog.Description>
          )}
          {children && <div className="mt-4">{children}</div>}
          <div className="mt-6 flex justify-end gap-2">
            <Dialog.Close asChild>
              <Button variant="secondary" disabled={pending}>
                Cancel
              </Button>
            </Dialog.Close>
            <Button
              variant={destructive ? 'danger' : 'primary'}
              loading={pending}
              onClick={onConfirm}
            >
              {confirmLabel}
            </Button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
