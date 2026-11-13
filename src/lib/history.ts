import type { StepKey } from '@/api/types'
import { STEP_LABEL } from './status'

const FIELD_LABELS: Record<string, string> = {
  'website.url': 'Website address',
  'website.summary': 'Website summary',
  'website.services': 'Services',
  'website.markets': 'Markets',
  'socials.linkedin': 'LinkedIn',
  'socials.facebook': 'Facebook',
  'socials.instagram': 'Instagram',
  'socials.x': 'X',
  'socials.youtube': 'YouTube',
  'socials.other': 'Other social links',
  'salesNav.accountUrl': 'Sales Navigator account',
  'salesNav.matchConfidence': 'Account match confidence',
  leadershipCoverage: 'Leadership coverage',
  duplicateOf: 'Duplicate flag',
  merge: 'Merged with another company',
}

const AI_ACTIONS: Record<string, string> = {
  save: 'AI draft edited',
  approve: 'AI draft approved',
  reject: 'AI draft rejected',
}

/** A plain-English name for a field in the change log. */
export function historyFieldLabel(field: string): string {
  const known = FIELD_LABELS[field]
  if (known) return known
  if (field.startsWith('stages.')) {
    const step = field.slice('stages.'.length) as StepKey
    return `${STEP_LABEL[step] ?? step} status`
  }
  if (field.startsWith('ai.')) return AI_ACTIONS[field.slice(3)] ?? 'AI draft changed'
  if (field.startsWith('contact:'))
    return field.includes(':ai.') ? 'Contact draft changed' : 'Contact'
  return field
}

/** How a before/after value reads in the log. Empty values say so instead of leaving a blank. */
export function formatHistoryValue(value: unknown): string {
  if (value === undefined || value === null || value === '') return '(empty)'
  if (Array.isArray(value)) return value.length === 0 ? '(empty)' : value.join(', ')
  if (typeof value === 'string') return value.replaceAll('_', ' ')
  return JSON.stringify(value)
}
