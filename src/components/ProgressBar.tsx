import { cn } from '@/lib/utils'

/** A thin bar plus the number: how far something is (0–100). The empty part is a visible track. */
export function ProgressBar({
  value,
  label,
  className,
  wide,
}: {
  value: number
  /** What the bar measures, for screen readers (for example "Run progress"). */
  label: string
  className?: string
  wide?: boolean
}) {
  const percent = Math.max(0, Math.min(100, Math.round(value)))
  return (
    <div className={cn('flex items-center gap-2', className)}>
      <div
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={percent}
        aria-label={label}
        className={cn('h-2 overflow-hidden rounded-full bg-track', wide ? 'w-full' : 'w-24')}
      >
        <div className="h-full rounded-full bg-primary" style={{ width: `${percent}%` }} />
      </div>
      <span className="w-10 shrink-0 text-right tabular-nums">{percent}%</span>
    </div>
  )
}
