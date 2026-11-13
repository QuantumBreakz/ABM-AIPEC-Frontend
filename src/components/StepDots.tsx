import type { StepKey, StepState } from '@/api/types'
import { STEP_KEYS } from '@/api/types'
import { formatRelative } from '@/lib/format'
import { STEP_LABEL, STEP_STATUS_META, TONE_DOT } from '@/lib/status'
import { cn } from '@/lib/utils'
import { Tooltip } from './ui/tooltip'

const NOT_STARTED: StepState = { status: 'not_started' }

/**
 * Eight dots in a row, one per step (profile → personalization).
 * Hover or focus a dot to see: step name, status, reason and last update.
 * The whole group also has a text summary for screen readers.
 */
export function StepDots({
  stages,
  className,
}: {
  stages: Partial<Record<StepKey, StepState>>
  className?: string
}) {
  const summary = STEP_KEYS.map(
    (key) => `${STEP_LABEL[key]}: ${STEP_STATUS_META[(stages[key] ?? NOT_STARTED).status].label}`,
  ).join(', ')

  return (
    <div className={cn('flex items-center gap-1.5', className)} role="group" aria-label={summary}>
      {STEP_KEYS.map((key) => {
        const state = stages[key] ?? NOT_STARTED
        const meta = STEP_STATUS_META[state.status]
        const updated = formatRelative(state.updatedAt)
        return (
          <Tooltip
            key={key}
            content={
              <>
                <span className="block font-medium">{STEP_LABEL[key]}</span>
                <span className="block">{meta.label}</span>
                {state.reason && <span className="mt-1 block opacity-90">{state.reason}</span>}
                {updated && <span className="mt-1 block opacity-70">Updated {updated}</span>}
              </>
            }
          >
            <span
              // Focusable so keyboard users can reach the tooltip
              tabIndex={0}
              data-step={key}
              data-status={state.status}
              className={cn(
                'size-3 rounded-full ring-offset-1',
                TONE_DOT[meta.tone],
                state.status === 'not_started' && 'bg-transparent ring-1 ring-border',
                state.status === 'in_progress' && 'animate-pulse',
              )}
            />
          </Tooltip>
        )
      })}
    </div>
  )
}
