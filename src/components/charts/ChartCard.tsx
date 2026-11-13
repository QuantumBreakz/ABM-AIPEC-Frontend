import { type ReactNode, useId } from 'react'
import { cn } from '@/lib/utils'

/** Card container for charts and structured sections, supporting an optional header action/badge slot. */
export function ChartCard({
  title,
  subtitle,
  action,
  children,
  className,
}: {
  title: string
  subtitle?: string
  action?: ReactNode
  children: ReactNode
  className?: string
}) {
  const id = useId()
  return (
    <section aria-labelledby={id} className={cn('card-elevated p-5 sm:p-6', className)}>
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/70 pb-3.5">
        <div>
          <h2 id={id} className="text-base font-semibold tracking-tight text-foreground">
            {title}
          </h2>
          {subtitle && <p className="mt-1 text-[0.8125rem] text-muted-foreground">{subtitle}</p>}
        </div>
        {action}
      </div>
      <div className="pt-4">{children}</div>
    </section>
  )
}
