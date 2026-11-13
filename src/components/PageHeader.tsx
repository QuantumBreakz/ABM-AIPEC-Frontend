import type { ReactNode } from 'react'
import { usePageTitle } from '@/lib/usePageTitle'

/**
 * Title row at the top of every page: heading, optional description, actions on the right.
 * It also names the browser tab ("Companies · ADIPEC Lead Gen").
 */
export function PageHeader({
  title,
  description,
  actions,
}: {
  title: string
  description?: string
  actions?: ReactNode
}) {
  usePageTitle(title)

  return (
    <header className="mb-6 flex flex-wrap items-end justify-between gap-4 border-b border-border/80 pb-5">
      <div className="min-w-0">
        <h1 className="text-[1.625rem] font-semibold leading-tight tracking-[-0.025em] text-foreground">
          {title}
        </h1>
        {description && (
          <p className="mt-1.5 max-w-2xl text-sm text-muted-foreground">{description}</p>
        )}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2.5">{actions}</div>}
    </header>
  )
}
