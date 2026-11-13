import type { EmailStatus } from '@/api/types'
import { EMAIL_STATUS_META, TONE_BADGE } from '@/lib/status'
import { cn } from '@/lib/utils'
import { Tooltip } from './ui/tooltip'

// Most useful first: confirmed, then problems, then "we do not know".
const ORDER: EmailStatus[] = ['verified', 'risky', 'invalid', 'unknown', 'not_checked']

/** At most this many pills are drawn; the rest fold into "+N" so rows stay one or two lines tall. */
const MAX_PILLS = 2

const pill =
  'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium whitespace-nowrap'

/** "2 Verified  1 Not checked": how many emails a company has in each state. */
export function EmailSummary({ counts }: { counts: Partial<Record<EmailStatus, number>> }) {
  const present = ORDER.filter((status) => (counts[status] ?? 0) > 0)
  if (present.length === 0) return <span className="text-muted-foreground">No emails</span>

  const shown = present.slice(0, MAX_PILLS)
  const hidden = present.slice(MAX_PILLS)

  return (
    <ul className="flex flex-wrap gap-1" aria-label="Emails by status">
      {shown.map((status) => {
        const meta = EMAIL_STATUS_META[status]
        return (
          <li key={status}>
            <Tooltip content={meta.description}>
              <span tabIndex={0} className={cn(pill, TONE_BADGE[meta.tone])}>
                <span className="tabular-nums">{counts[status]}</span> {meta.label}
              </span>
            </Tooltip>
          </li>
        )
      })}
      {hidden.length > 0 && (
        <li>
          <Tooltip
            content={hidden.map((status) => (
              <span key={status} className="block">
                {counts[status]} {EMAIL_STATUS_META[status].label}
              </span>
            ))}
          >
            <span tabIndex={0} className={cn(pill, 'bg-muted text-muted-foreground')}>
              +{hidden.length} more
              <span className="sr-only">
                : {hidden.map((s) => `${counts[s]} ${EMAIL_STATUS_META[s].label}`).join(', ')}
              </span>
            </span>
          </Tooltip>
        </li>
      )}
    </ul>
  )
}
