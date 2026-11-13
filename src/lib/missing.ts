import type { StepState } from '@/api/types'

/**
 * The reason to show next to "Not available". A recorded reason always wins; otherwise a step that
 * has not run says so, and a finished step says what a finished-but-empty result means.
 */
export function missingReason(state: StepState, whenFinished: string): string {
  if (state.reason) return state.reason
  if (state.status === 'not_started' || state.status === 'in_progress') return 'Not collected yet'
  return whenFinished
}
