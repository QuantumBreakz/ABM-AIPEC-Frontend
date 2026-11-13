import type { EmailStatus } from '@/api/types'
import { EMAIL_STATUS_META, TONE_BADGE } from '@/lib/status'
import { cn } from '@/lib/utils'
import { Tooltip } from './ui/tooltip'

// Most useful first: confirmed, then problems, then "we do not know".
const ORDER: EmailStatus[] = ['verified', 'risky', 'invalid', 'unknown', 'not_checked']

/** "2 Verified  1 Not checked": how many emails a company has in each state. */
export function EmailSummary({ counts }: { counts: Partial<Record<EmailStatus, number>> }) {
  const present = ORDER.filter((status) => (counts[status] ?? 0) > 0)
  if (present.length === 0) return <span className="text-muted-foreground">No emails</span>

  return (
    <ul className="flex flex-wrap gap-1" aria-label="Emails by status">
      {present.map((status) => {
        const meta = EMAIL_STATUS_META[status]
        return (
          <li key={status}>
            <Tooltip content={meta.description}>
              <span
                tabIndex={0}
                className={cn(
                  'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium whitespace-nowrap',
                  TONE_BADGE[meta.tone],
                )}
              >
                <span className="tabular-nums">{counts[status]}</span> {meta.label}
              </span>
            </Tooltip>
          </li>
        )
      })}
    </ul>
  )
}
