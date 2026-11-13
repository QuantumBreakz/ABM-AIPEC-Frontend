import { type ReactNode, useId } from 'react'
import { cn } from '@/lib/utils'

/** The frame around a chart: title and subtitle say what is plotted (so one series needs no legend box). */
export function ChartCard({
  title,
  subtitle,
  children,
  className,
}: {
  title: string
  subtitle?: string
  children: ReactNode
  className?: string
}) {
  const id = useId()
  return (
    <section
      aria-labelledby={id}
      className={cn('rounded-lg border border-border bg-surface p-5', className)}
    >
      <h2 id={id} className="text-base font-semibold">
        {title}
      </h2>
      {subtitle && <p className="mt-0.5 text-[13px] text-muted-foreground">{subtitle}</p>}
      <div className="mt-4">{children}</div>
    </section>
  )
}
