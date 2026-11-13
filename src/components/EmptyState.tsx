import { Inbox, type LucideIcon } from 'lucide-react'
import type { ReactNode } from 'react'

/** "Nothing here" with a hint about what to do next. */
export function EmptyState({
  title,
  hint,
  action,
  icon: Icon = Inbox,
}: {
  title: string
  hint?: string
  action?: ReactNode
  icon?: LucideIcon
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 px-6 py-14 text-center">
      <div className="flex size-11 items-center justify-center rounded-full bg-muted text-muted-foreground">
        <Icon className="size-5" aria-hidden />
      </div>
      <div>
        <p className="font-medium">{title}</p>
        {hint && <p className="mt-1 max-w-sm text-muted-foreground">{hint}</p>}
      </div>
      {action}
    </div>
  )
}
