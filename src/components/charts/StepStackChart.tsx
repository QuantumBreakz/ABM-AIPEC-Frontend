import { Link } from 'react-router'
import type { Overview, StepKey, StepStatus } from '@/api/types'
import { STEP_KEYS } from '@/api/types'
import { Tooltip } from '@/components/ui/tooltip'
import { formatNumber } from '@/lib/format'
import { plural, STACK_ORDER, STEP_FILL, toSegments } from '@/lib/overview'
import { STEP_LABEL, STEP_STATUS_META } from '@/lib/status'
import { Legend } from './Legend'

type Props = {
  byStep: Overview['byStep']
  total: number
  edition: number
  view: 'chart' | 'table'
}

const doneOf = (counts: Partial<Record<StepStatus, number>>) =>
  (counts.completed ?? 0) + (counts.approved ?? 0)

const link = (edition: number, step: StepKey, status: StepStatus) =>
  `/companies?edition=${edition}&step=${step}&stepStatus=${status}`

/**
 * One bar per step; every bar is all companies of the edition, split by status.
 * Thin bars (24px), 4px rounded outer ends, a 2px gap between segments, no borders.
 * Each segment links to the company list filtered the same way.
 */
export function StepStackChart({ byStep, total, edition, view }: Props) {
  const present = STACK_ORDER.filter((status) =>
    STEP_KEYS.some((key) => (byStep[key]?.[status] ?? 0) > 0),
  )

  if (view === 'table') {
    return (
      <div className="overflow-x-auto">
        <table className="w-full text-left text-[0.8125rem]">
          <caption className="sr-only">Companies per step and status</caption>
          <thead>
            <tr className="border-b border-border text-muted-foreground">
              <th scope="col" className="py-2.5 pr-4 font-semibold">
                Step
              </th>
              {present.map((status) => (
                <th key={status} scope="col" className="px-2 py-2.5 text-right font-semibold">
                  {STEP_STATUS_META[status].label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {STEP_KEYS.map((key) => (
              <tr
                key={key}
                className="border-b border-border/70 transition-colors last:border-0 hover:bg-muted/40"
              >
                <th scope="row" className="py-2.5 pr-4 font-medium text-foreground">
                  {STEP_LABEL[key]}
                </th>
                {present.map((status) => (
                  <td key={status} className="px-2 py-2.5 text-right tabular-nums">
                    {formatNumber(byStep[key]?.[status] ?? 0)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-5">
      <ul className="flex flex-col gap-3.5" aria-label="Progress per step">
        {STEP_KEYS.map((key, index) => {
          const counts = byStep[key] ?? {}
          const segments = toSegments(counts, STACK_ORDER, total)
          const done = doneOf(counts)
          return (
            <li
              key={key}
              className="grid items-center gap-x-4 gap-y-1.5 sm:grid-cols-[12rem_minmax(0,1fr)_6rem]"
            >
              <div className="flex items-center gap-2">
                <span className="font-mono text-[0.6875rem] font-medium text-muted-foreground">
                  0{index + 1}
                </span>
                <span className="text-sm font-medium text-foreground">{STEP_LABEL[key]}</span>
              </div>
              <div
                className="flex h-6 gap-0.5 rounded-md"
                role="group"
                aria-label={STEP_LABEL[key]}
              >
                {segments.map((segment) => {
                  const meta = STEP_STATUS_META[segment.key]
                  const sentence = `${STEP_LABEL[key]}: ${meta.label}, ${formatNumber(segment.count)} ${plural(segment.count, 'company', 'companies')} (${segment.percent}%)`
                  return (
                    <Tooltip
                      key={segment.key}
                      content={
                        <>
                          <span className="block font-medium">
                            {STEP_LABEL[key]} · {meta.label}
                          </span>
                          <span className="block">
                            {formatNumber(segment.count)}{' '}
                            {plural(segment.count, 'company', 'companies')} ({segment.percent}%)
                          </span>
                          <span className="mt-1 block opacity-70">Click to see them</span>
                        </>
                      }
                    >
                      <Link
                        to={link(edition, key, segment.key)}
                        aria-label={sentence}
                        className="min-w-1 transition-opacity duration-150 first:rounded-l-[5px] last:rounded-r-[5px] hover:opacity-85"
                        style={{
                          flex: `${segment.count} 1 0`,
                          background: STEP_FILL[segment.key],
                        }}
                      />
                    </Tooltip>
                  )
                })}
              </div>
              <span className="text-[0.8125rem] text-muted-foreground sm:text-right">
                <span className="font-semibold tabular-nums text-foreground">
                  {formatNumber(done)}
                </span>{' '}
                done
              </span>
            </li>
          )
        })}
      </ul>
      <div className="border-t border-border/60 pt-4">
        <Legend
          label="Status colours"
          items={present.map((status) => ({
            key: status,
            label: STEP_STATUS_META[status].label,
            fill: STEP_FILL[status],
            icon: STEP_STATUS_META[status].icon,
          }))}
        />
      </div>
    </div>
  )
}
