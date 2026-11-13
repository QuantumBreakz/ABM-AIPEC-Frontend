import type { Run, RunStep } from '@/api/types'
import { STEP_KEYS } from '@/api/types'
import { STEP_LABEL } from './status'

/** Every step a run can do, in the order the pipeline works through them. */
export const RUN_STEPS: RunStep[] = ['directory', ...STEP_KEYS]

export const RUN_STEP_LABEL: Record<RunStep, string> = {
  directory: 'Exhibitor directory',
  ...STEP_LABEL,
}

export type StepProgress = { queued: number; done: number; failed: number }

const EMPTY: StepProgress = { queued: 0, done: 0, failed: 0 }

export const stepProgress = (run: Run, step: RunStep): StepProgress => run.perStep[step] ?? EMPTY

/**
 * How much of the whole run is finished, 0–100. A step item counts as finished when it is done or
 * failed (it will not be retried by this run). A completed run is always 100.
 */
export function runPercent(run: Run): number {
  if (run.status === 'completed') return 100
  let total = 0
  let finished = 0
  for (const step of run.steps) {
    const p = stepProgress(run, step)
    total += p.queued + p.done + p.failed
    finished += p.done + p.failed
  }
  return total > 0 ? Math.round((100 * finished) / total) : 0
}

/** Runs that are still moving; the screens poll only while one of these is on show. */
export const isRunning = (run: Pick<Run, 'status'>) => run.status === 'running'
