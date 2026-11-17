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
    <header className="mb-6 flex flex-col gap-3 border-b border-border/80 pb-5 sm:flex-row sm:items-end sm:justify-between sm:gap-4">
      <div className="min-w-0">
        <h1 className="text-[1.625rem] font-semibold leading-tight tracking-[-0.025em] text-foreground">
          {title}
        </h1>
        {description && (
          <p className="mt-1.5 max-w-2xl text-sm text-muted-foreground">{description}</p>
        )}
      </div>
      {actions && (
        <div className="flex w-full flex-wrap items-center gap-2.5 sm:w-auto sm:justify-end">
          {actions}
        </div>
      )}
    </header>
  )
}
