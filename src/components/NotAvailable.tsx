import { cn } from '@/lib/utils'

/** Use instead of an empty cell. Missing data must look missing, never like a blank success. */
export function NotAvailable({ reason, className }: { reason?: string; className?: string }) {
  return (
    <span className={cn('text-muted-foreground', className)}>
      <span className="italic">Not available</span>
      {reason && <span className="not-italic"> · {reason}</span>}
    </span>
  )
}
