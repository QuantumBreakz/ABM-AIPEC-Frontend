import type { Company, StepStatus } from '@/api/types'
import { STEP_KEYS } from '@/api/types'
import { DateTime } from '@/components/DateTime'
import { StatusBadge } from '@/components/StatusBadge'
import { STEP_LABEL } from '@/lib/status'

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
 */
export function StepsPanel({ stages }: { stages: Company['stages'] }) {
  return (
    <section
      aria-labelledby="steps-heading"
      className="mb-6 rounded-lg border border-border bg-surface p-5"
    >
      <h2 id="steps-heading" className="text-base font-semibold">
        Steps
      </h2>
      <p className="mt-0.5 text-[13px] text-muted-foreground">
        How far each step has got for this company, and why when it has not finished.
      </p>
      <ol className="mt-4 grid gap-x-8 gap-y-4 md:grid-cols-2">
        {STEP_KEYS.map((key) => {
          const state = stages[key]
          const explain = NEEDS_REASON.includes(state.status)
          return (
            <li key={key} className="min-w-0">
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                <span className="w-36 shrink-0 text-sm font-medium">{STEP_LABEL[key]}</span>
                <StatusBadge kind="step" status={state.status} reason={state.reason} />
                {state.updatedAt && (
                  <span className="ml-auto text-[13px] text-muted-foreground">
                    <DateTime value={state.updatedAt} />
                  </span>
                )}
              </div>
              {state.reason ? (
                <p className="mt-1 pl-[9.75rem] text-[13px] text-muted-foreground">
                  {state.reason}
                </p>
              ) : explain ? (
                <p className="mt-1 pl-[9.75rem] text-[13px] italic text-muted-foreground">
                  No reason was recorded.
                </p>
              ) : null}
            </li>
          )
        })}
      </ol>
    </section>
  )
}
