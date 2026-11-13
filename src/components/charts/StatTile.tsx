import { ArrowUpRight, type LucideIcon } from 'lucide-react'
import type { ReactNode } from 'react'
import { Link } from 'react-router'
import { TONE_BADGE, type Tone } from '@/lib/status'
import { cn } from '@/lib/utils'

type Props = {
  label: string
  value: ReactNode
  /** Small line under the value: what the number means. */
  hint?: ReactNode
  /** Makes the whole tile a link (for example to the filtered company list). */
  to?: string
  icon?: LucideIcon
  iconTone?: Tone
  /** A figure from outside our own data (ADIPEC's advertised count): drawn quieter, never compared. */
  reference?: boolean
  /** The one big number the page leads with. */
  hero?: boolean
  className?: string
}

/** A single headline number: label, value, optional hint. Never a chart for one value. */
export function StatTile({
  label,
  value,
  hint,
  to,
  icon: Icon,
  iconTone = 'neutral',
  reference,
  hero,
  className,
}: Props) {
  const body = (
    <div className="flex h-full flex-col justify-between gap-3">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2">
          <p className="text-[0.8125rem] font-medium text-muted-foreground">{label}</p>
          {reference && (
            <span className="rounded-full bg-muted px-2 py-0.5 text-[0.6875rem] font-medium text-muted-foreground">
              External
            </span>
          )}
        </div>
        <div className="flex items-center gap-1.5">
          {Icon && (
            <span
              aria-hidden
              className={cn(
                'flex size-8 shrink-0 items-center justify-center rounded-lg ring-1 ring-inset ring-current/15',
                TONE_BADGE[iconTone],
              )}
            >
              <Icon className="size-4" />
            </span>
          )}
        </div>
      </div>

      <div>
        <div className="flex items-baseline justify-between gap-2">
          <p
            className={cn(
              'font-semibold tabular-nums tracking-[-0.03em]',
              hero ? 'text-4xl sm:text-5xl' : 'text-[1.75rem] leading-tight',
              reference ? 'text-muted-foreground' : 'text-foreground',
            )}
          >
            {value}
          </p>
          {to && (
            <ArrowUpRight
              aria-hidden
              className="size-4 shrink-0 text-muted-foreground opacity-60 transition-transform duration-150 group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-primary group-hover:opacity-100"
            />
          )}
        </div>
        {hint && <p className="mt-1.5 text-[0.8125rem] text-muted-foreground">{hint}</p>}
      </div>
    </div>
  )

  const classes = cn(
    'group relative block overflow-hidden rounded-2xl border p-5 transition-all duration-200',
    reference
      ? 'border-dashed border-border-strong bg-surface/60'
      : 'border-border bg-surface shadow-[0_1px_2px_rgb(14_23_38/0.04)]',
    hero && 'border-t-2 border-t-primary bg-gradient-to-b from-primary/[0.03] to-surface',
    to && 'hover:border-primary/60 hover:shadow-md',
    className,
  )

  const card = (
    <>
      {hero && (
        <span
          aria-hidden
          className="pointer-events-none absolute -right-10 -top-10 size-36 rounded-full bg-[var(--primary)]/10 blur-2xl transition-opacity group-hover:opacity-100"
        />
      )}
      {body}
    </>
  )
  return to ? (
    <Link to={to} className={classes}>
      {card}
    </Link>
  ) : (
    <div className={classes}>{card}</div>
  )
}
