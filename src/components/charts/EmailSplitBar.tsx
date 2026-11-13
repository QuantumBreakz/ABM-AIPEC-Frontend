import { Mail } from 'lucide-react'
import { Link } from 'react-router'
import type { EmailStatus } from '@/api/types'
import { EmptyState } from '@/components/EmptyState'
import { Tooltip } from '@/components/ui/tooltip'
import { formatNumber } from '@/lib/format'
import {
  EMAIL_FILL,
  EMAIL_INK,
  EMAIL_ORDER,
  MIN_LABEL_PERCENT,
  plural,
  toSegments,
} from '@/lib/overview'
import { EMAIL_STATUS_META } from '@/lib/status'
import { Legend } from './Legend'

type Props = {
  counts: Record<EmailStatus, number>
  edition: number
  view: 'chart' | 'table'
}

/**
 * One whole (all email addresses) split into at most five parts: a tall segmented bar.
 * The share is printed inside a part only when it fits; the legend lists names only.
 */
export function EmailSplitBar({ counts, edition, view }: Props) {
  const total = EMAIL_ORDER.reduce((sum, status) => sum + counts[status], 0)
  if (total === 0) {
    return (
      <EmptyState
        icon={Mail}
        title="No emails collected yet"
        hint="They appear here once contacts have business email addresses."
      />
    )
  }
  const segments = toSegments(counts, EMAIL_ORDER, total)

  if (view === 'table') {
    return (
      <table className="w-full text-left text-[13px]">
        <caption className="sr-only">Email addresses by status</caption>
        <thead>
          <tr className="border-b border-border text-muted-foreground">
            <th scope="col" className="py-2 pr-4 font-medium">
              Status
            </th>
            <th scope="col" className="px-2 py-2 text-right font-medium">
              Emails
            </th>
            <th scope="col" className="px-2 py-2 text-right font-medium">
              Share
            </th>
          </tr>
        </thead>
        <tbody>
          {EMAIL_ORDER.map((status) => (
            <tr key={status} className="border-b border-border last:border-0">
              <th scope="row" className="py-2 pr-4 font-medium">
                {EMAIL_STATUS_META[status].label}
              </th>
              <td className="px-2 py-2 text-right tabular-nums">{formatNumber(counts[status])}</td>
              <td className="px-2 py-2 text-right tabular-nums">
                {Math.round((100 * counts[status]) / total)}%
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    )
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex h-7 gap-0.5" role="group" aria-label="Emails by status">
        {segments.map((segment) => {
          const meta = EMAIL_STATUS_META[segment.key]
          const sentence = `${meta.label}: ${formatNumber(segment.count)} ${plural(segment.count, 'email', 'emails')} (${segment.percent}%)`
          return (
            <Tooltip
              key={segment.key}
              content={
                <>
                  <span className="block font-medium">{meta.label}</span>
                  <span className="block">
                    {formatNumber(segment.count)} {plural(segment.count, 'email', 'emails')} (
                    {segment.percent}%)
                  </span>
                  <span className="mt-1 block opacity-80">{meta.description}</span>
                </>
              }
            >
              <Link
                to={`/companies?edition=${edition}&emailStatus=${segment.key}`}
                aria-label={sentence}
                className="flex min-w-1 items-center whitespace-nowrap px-2 text-xs font-semibold first:rounded-l-[4px] last:rounded-r-[4px]"
                style={{
                  flex: `${segment.count} 1 0`,
                  background: EMAIL_FILL[segment.key],
                  color: EMAIL_INK[segment.key],
                }}
              >
                {segment.percent >= MIN_LABEL_PERCENT ? `${segment.percent}%` : null}
              </Link>
            </Tooltip>
          )
        })}
      </div>
      <Legend
        label="Email status colours"
        items={EMAIL_ORDER.filter((status) => counts[status] > 0).map((status) => ({
          key: status,
          label: EMAIL_STATUS_META[status].label,
          fill: EMAIL_FILL[status],
          icon: EMAIL_STATUS_META[status].icon,
        }))}
      />
      <p className="text-[13px] text-muted-foreground">
        <strong className="font-medium text-foreground">Not checked</strong> means no permitted
        check has run yet. It is not a verified address.
      </p>
    </div>
  )
}
