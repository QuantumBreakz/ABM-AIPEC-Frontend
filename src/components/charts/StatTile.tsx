import type { LucideIcon } from 'lucide-react'
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
    <>
      <div className="flex items-start justify-between gap-3">
        <p className="text-[13px] font-medium text-muted-foreground">{label}</p>
        {Icon && (
          <span
            aria-hidden
            className={cn(
              'flex size-7 shrink-0 items-center justify-center rounded-full',
              TONE_BADGE[iconTone],
            )}
          >
            <Icon className="size-4" />
          </span>
        )}
      </div>
      <p
        className={cn(
          'mt-2 font-semibold tracking-tight',
          hero ? 'text-5xl' : 'text-2xl',
          reference && 'text-muted-foreground',
        )}
      >
        {value}
      </p>
      {hint && <p className="mt-1 text-[13px] text-muted-foreground">{hint}</p>}
    </>
  )

  const classes = cn(
    'block rounded-lg border bg-surface p-4',
    reference ? 'border-dashed border-border-strong' : 'border-border',
    to && 'transition-colors hover:border-primary/60 hover:bg-muted/40',
    className,
  )

  return to ? (
    <Link to={to} className={classes}>
      {body}
    </Link>
  ) : (
    <div className={classes}>{body}</div>
  )
}
