import { useState } from 'react'
import type { Company, StepKey, StepStatus } from '@/api/types'
import { STEP_KEYS } from '@/api/types'
import { DateTime } from '@/components/DateTime'
import { StatusBadge } from '@/components/StatusBadge'
import { Button } from '@/components/ui/button'
import { STEP_LABEL, STEP_STATUS_META, TONE_DOT } from '@/lib/status'
import { cn } from '@/lib/utils'
import { StepOverrideDialog } from './StepOverrideDialog'

/** Statuses that need an explanation. If no reason was recorded we say so instead of staying silent. */
const NEEDS_REASON: StepStatus[] = [
  'failed',
  'partial',
  'restricted',
  'pending_access',
  'needs_review',
]

/**
 * The eight steps in order, each with its status, the full reason and when it last changed.
 * This is where "why is this step not done?" is answered in full (the tooltips elsewhere are short).
 * Anyone can set a step's status by hand; a reason is required and the change is logged.
 */
export function StepsPanel({
  companyId,
  stages,
}: {
  companyId: string
  stages: Company['stages']
}) {
  const [overriding, setOverriding] = useState<StepKey | null>(null)
  const completed = STEP_KEYS.filter((k) => stages[k].status === 'completed').length

  return (
    <section aria-labelledby="steps-heading" className="card-elevated mb-6 p-5 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/70 pb-3.5">
        <div className="flex items-center gap-2.5">
          <h2 id="steps-heading" className="text-base font-semibold tracking-tight text-foreground">
            Steps
          </h2>
          <span className="rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium tabular-nums text-muted-foreground">
            {completed} / {STEP_KEYS.length} done
          </span>
        </div>
        <div className="flex items-center gap-1" aria-hidden>
          {STEP_KEYS.map((key) => (
            <span
              key={key}
              className={cn(
                'h-1.5 w-4 rounded-full',
                TONE_DOT[STEP_STATUS_META[stages[key].status].tone],
              )}
            />
          ))}
        </div>
      </div>
      <ol className="mt-4 grid gap-3 md:grid-cols-2">
        {STEP_KEYS.map((key, idx) => {
          const state = stages[key]
          const explain = NEEDS_REASON.includes(state.status)
          return (
            <li
              key={key}
              className="min-w-0 rounded-lg border border-border/70 bg-muted/20 px-3.5 py-2.5 transition-colors hover:border-border"
            >
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
                <span
                  data-index={`0${idx + 1}`}
                  className="flex min-w-40 items-center gap-2 text-sm font-medium text-foreground before:font-mono before:text-[0.6875rem] before:text-muted-foreground before:content-[attr(data-index)]"
                >
                  {STEP_LABEL[key]}
                </span>
                <StatusBadge kind="step" status={state.status} reason={state.reason} />
                <span className="ml-auto flex items-center gap-2 text-[0.8125rem] text-muted-foreground">
                  {state.updatedAt && <DateTime value={state.updatedAt} />}
                  <Button
                    variant="ghost"
                    size="sm"
                    className="min-h-7 px-2 text-[0.8125rem]"
                    aria-label={`Change status of ${STEP_LABEL[key]}`}
                    onClick={() => setOverriding(key)}
                  >
                    Change
                  </Button>
                </span>
              </div>
              {state.reason ? (
                <p className="mt-1.5 border-t border-border/50 pt-1.5 text-[0.8125rem] text-muted-foreground">
                  {state.reason}
                </p>
              ) : explain ? (
                <p className="mt-1.5 border-t border-border/50 pt-1.5 text-[0.8125rem] italic text-muted-foreground">
                  No reason was recorded.
                </p>
              ) : null}
            </li>
          )
        })}
      </ol>
      <StepOverrideDialog
        companyId={companyId}
        step={overriding}
        current={stages[overriding ?? 'profile']}
        onOpenChange={(open) => !open && setOverriding(null)}
      />
    </section>
  )
}
