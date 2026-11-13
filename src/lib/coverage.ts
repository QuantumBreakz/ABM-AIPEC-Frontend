import type { Coverage } from '@/api/types'

/**
 * How complete the list of leaders is (FR-16). Relationship Explorer shows only a limited set of
 * people, so the list is never presented as complete unless a person has said they checked.
 */
export const COVERAGE_META: Record<Coverage, { label: string; description: string }> = {
  unknown: {
    label: 'Unknown',
    description: 'Nobody has checked how complete the list of leaders is.',
  },
  confirmed_partial: {
    label: 'Confirmed partial',
    description: 'Some leaders are saved, and the list is known to be incomplete.',
  },
  reviewed: {
    label: 'Reviewed',
    description: 'A person looked beyond the limited Relationship Explorer panel.',
  },
}

export const COVERAGE_HINT =
  'Relationship Explorer shows only a limited set of people. Choose Reviewed only after you have checked beyond it.'
