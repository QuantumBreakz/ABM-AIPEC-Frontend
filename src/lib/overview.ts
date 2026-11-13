import type { EmailStatus, StepStatus } from '@/api/types'

/**
 * Stack order of the status segments, left to right. It is NOT arbitrary: it was checked with
 * the dataviz palette validator so that neighbouring segments stay distinguishable for people
 * with colour-vision differences, in both light and dark theme. Do not re-order casually.
 */
export const STACK_ORDER: StepStatus[] = [
  'approved',
  'completed',
  'in_progress',
  'needs_review',
  'partial',
  'restricted',
  'pending_access',
  'failed',
  'not_started',
]

/** Fills come from CSS variables (src/index.css), so they follow the light/dark theme. */
export const STEP_FILL: Record<StepStatus, string> = {
  approved: 'var(--seg-approved)',
  completed: 'var(--seg-completed)',
  in_progress: 'var(--seg-in-progress)',
  needs_review: 'var(--seg-needs-review)',
  partial: 'var(--seg-partial)',
  restricted: 'var(--seg-restricted)',
  pending_access: 'var(--seg-pending-access)',
  failed: 'var(--seg-failed)',
  not_started: 'var(--seg-not-started)',
}

export const EMAIL_ORDER: EmailStatus[] = ['verified', 'risky', 'invalid', 'unknown', 'not_checked']

export const EMAIL_FILL: Record<EmailStatus, string> = {
  verified: 'var(--success)',
  risky: 'var(--warning)',
  invalid: 'var(--danger)',
  unknown: 'var(--neutral)',
  not_checked: 'var(--seg-not-started)',
}

/** Text colour for a label printed inside an email segment. */
export const EMAIL_INK: Record<EmailStatus, string> = {
  verified: 'var(--ink-on-strong)',
  risky: 'var(--ink-on-strong)',
  invalid: 'var(--ink-on-strong)',
  unknown: 'var(--ink-on-strong)',
  not_checked: 'var(--foreground)',
}

export type Segment<K extends string> = { key: K; count: number; percent: number }

/** Counts in stack order, zero-count parts dropped (a part at zero draws nothing). */
export function toSegments<K extends string>(
  counts: Partial<Record<K, number>>,
  order: K[],
  total: number,
): Segment<K>[] {
  return order
    .map((key) => ({ key, count: counts[key] ?? 0 }))
    .filter((part) => part.count > 0)
    .map((part) => ({ ...part, percent: total > 0 ? Math.round((100 * part.count) / total) : 0 }))
}

/** A label is only printed inside a segment when it is wide enough to hold it comfortably. */
export const MIN_LABEL_PERCENT = 15

export const plural = (n: number, one: string, many: string) => (n === 1 ? one : many)
