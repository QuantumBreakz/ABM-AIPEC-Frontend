import { AI_STATUSES, EMAIL_STATUSES, STEP_KEYS, STEP_STATUSES } from '@/api/types'
import { STEP_LABEL, STEP_STATUS_META } from './status'

export type FilterOption = { value: string; label: string }

export type FilterField =
  | { key: string; label: string; type: 'search'; placeholder?: string }
  | { key: string; label: string; type: 'text'; placeholder?: string }
  | { key: string; label: string; type: 'number'; placeholder?: string }
  | { key: string; label: string; type: 'select'; options: FilterOption[] }
  | { key: string; label: string; type: 'boolean'; yesLabel?: string; noLabel?: string }

export type FilterValues = Record<string, string | number | boolean | undefined>

/** Read filter values from the URL. Unknown or invalid values are ignored. */
export function filtersFromParams(params: URLSearchParams, fields: FilterField[]): FilterValues {
  const out: FilterValues = {}
  for (const field of fields) {
    const raw = params.get(field.key)
    if (raw === null || raw === '') continue
    switch (field.type) {
      case 'number': {
        const n = Number(raw)
        if (Number.isFinite(n)) out[field.key] = n
        break
      }
      case 'boolean':
        if (raw === 'true') out[field.key] = true
        else if (raw === 'false') out[field.key] = false
        break
      case 'select':
        if (field.options.some((o) => o.value === raw)) out[field.key] = raw
        break
      default:
        out[field.key] = raw
    }
  }
  return out
}

/**
 * Write filter values into a copy of the current params.
 * Keeps unrelated params (sort, tab…) and resets `page` because results changed.
 */
export function filtersToParams(
  values: FilterValues,
  fields: FilterField[],
  current: URLSearchParams = new URLSearchParams(),
): URLSearchParams {
  const next = new URLSearchParams(current)
  for (const field of fields) {
    const value = values[field.key]
    if (value === undefined || value === '') next.delete(field.key)
    else next.set(field.key, String(value))
  }
  next.delete('page')
  return next
}

export const countActiveFilters = (values: FilterValues) =>
  Object.values(values).filter((v) => v !== undefined && v !== '').length

const toOptions = <T extends string>(values: T[], label: (v: T) => string): FilterOption[] =>
  values.map((value) => ({ value, label: label(value) }))

/** Filters of the company list (matches CompanyFilters in the contract). */
export const COMPANY_FILTER_FIELDS: FilterField[] = [
  { key: 'q', label: 'Search', type: 'search', placeholder: 'Search companies…' },
  { key: 'edition', label: 'Edition', type: 'number', placeholder: 'e.g. 2026' },
  { key: 'country', label: 'Country', type: 'text', placeholder: 'e.g. AE' },
  { key: 'category', label: 'Category', type: 'text', placeholder: 'e.g. Drilling' },
  {
    key: 'step',
    label: 'Step',
    type: 'select',
    options: toOptions(STEP_KEYS, (k) => STEP_LABEL[k]),
  },
  {
    key: 'stepStatus',
    label: 'Step status',
    type: 'select',
    options: toOptions(STEP_STATUSES, (s) => STEP_STATUS_META[s].label),
  },
  {
    key: 'hasContacts',
    label: 'Contacts',
    type: 'boolean',
    yesLabel: 'Has contacts',
    noLabel: 'No contacts',
  },
  {
    key: 'emailStatus',
    label: 'Email status',
    type: 'select',
    options: toOptions(EMAIL_STATUSES, (s) => s.replace('_', ' ')),
  },
  {
    key: 'aiStatus',
    label: 'AI status',
    type: 'select',
    options: toOptions(AI_STATUSES, (s) => s.replace('_', ' ')),
  },
  {
    key: 'duplicate',
    label: 'Duplicates',
    type: 'boolean',
    yesLabel: 'Duplicates only',
    noLabel: 'Hide duplicates',
  },
]
