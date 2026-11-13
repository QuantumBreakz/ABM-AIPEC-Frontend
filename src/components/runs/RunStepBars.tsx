import { CheckCircle2, CircleDashed, XCircle } from 'lucide-react'
import type { Run } from '@/api/types'
import { Legend } from '@/components/charts/Legend'
import { formatNumber } from '@/lib/format'
import { RUN_STEP_LABEL, stepProgress } from '@/lib/runs'

const FILL = {
  done: 'var(--seg-completed)',
  failed: 'var(--seg-failed)',
  queued: 'var(--seg-not-started)',
}

/**
 * One thin bar per step of the run: done, failed and still waiting. The numbers are printed
 * beside each bar, so nothing depends on reading colour.
 */
export function RunStepBars({ run }: { run: Run }) {
  return (
    <div className="flex flex-col gap-5">
      <ul className="flex flex-col gap-3" aria-label="Progress per step">
        {run.steps.map((step) => {
          const p = stepProgress(run, step)
          const total = p.done + p.failed + p.queued
          const part = (key: 'done' | 'failed' | 'queued') =>
            p[key] > 0 ? (
              <div
                key={key}
                className="min-w-1 first:rounded-l-[4px] last:rounded-r-[4px]"
                style={{ flex: `${p[key]} 1 0`, background: FILL[key] }}
              />
            ) : null
          return (
            <li
              key={step}
              className="grid items-center gap-x-4 gap-y-1 sm:grid-cols-[11rem_minmax(0,1fr)_13rem]"
            >
              <span className="text-sm font-medium">{RUN_STEP_LABEL[step]}</span>
              <div
                className="flex h-4 gap-0.5"
                role="img"
                aria-label={`${RUN_STEP_LABEL[step]}: ${p.done} done, ${p.failed} failed, ${p.queued} waiting`}
              >
                {total === 0 ? (
                  <div className="flex-1 rounded-[4px]" style={{ background: FILL.queued }} />
                ) : (
                  <>
                    {part('done')}
                    {part('failed')}
                    {part('queued')}
                  </>
                )}
              </div>
              <span className="text-[13px] text-muted-foreground sm:text-right">
                <span className="tabular-nums text-foreground">{formatNumber(p.done)}</span> done ·{' '}
                <span className="tabular-nums text-foreground">{formatNumber(p.failed)}</span>{' '}
                failed ·{' '}
                <span className="tabular-nums text-foreground">{formatNumber(p.queued)}</span>{' '}
                waiting
              </span>
            </li>
          )
        })}
      </ul>
      <Legend
        label="Progress colours"
        items={[
          { key: 'done', label: 'Done', fill: FILL.done, icon: CheckCircle2 },
          { key: 'failed', label: 'Failed', fill: FILL.failed, icon: XCircle },
          { key: 'queued', label: 'Waiting', fill: FILL.queued, icon: CircleDashed },
        ]}
      />
    </div>
  )
}
