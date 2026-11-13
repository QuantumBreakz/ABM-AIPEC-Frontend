import { cn } from '@/lib/utils'

/** Use instead of an empty cell. Missing data must look missing, never like a blank success. */
export function NotAvailable({
  reason,
  label = 'Not available',
  className,
}: {
  reason?: string
  /** Wording for the missing value; "Not found" reads better for things we looked for. */
  label?: string
  className?: string
}) {
  return (
    <span className={cn('text-muted-foreground', className)}>
      <span className="italic">{label}</span>
      {reason && <span className="not-italic"> · {reason}</span>}
    </span>
  )
}
