import { type ReactNode, useEffect } from 'react'

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
  useEffect(() => {
    document.title = `${title} · ADIPEC Lead Gen`
  }, [title])

  return (
    <header className="mb-6 flex flex-wrap items-start justify-between gap-4">
      <div className="min-w-0">
        <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
        {description && <p className="mt-1 max-w-2xl text-muted-foreground">{description}</p>}
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </header>
  )
}
