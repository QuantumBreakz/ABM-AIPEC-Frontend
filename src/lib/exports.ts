import type { CompanyFilters, ExportKind } from '@/api/types'
import { STEP_LABEL, STEP_STATUS_META } from './status'

export const EXPORT_KINDS: { value: ExportKind; label: string; description: string }[] = [
  {
    value: 'companies',
    label: 'Companies',
    description: 'One row per company: profile, website, socials, status of every step.',
  },
  {
    value: 'contacts',
    label: 'Contacts',
    description: 'One row per person and email, with where each email came from.',
  },
  {
    value: 'outreach',
    label: 'Outreach',
    description: 'Approved drafts for each contact, ready to copy and send yourself.',
  },
]

export const EXPORT_VERSIONS = [
  {
    value: 'initial' as const,
    label: 'Initial',
    description: 'Before the email check. Emails are listed as found and never marked Verified.',
  },
  {
    value: 'final' as const,
    label: 'Final',
    description: 'After the email check. Includes the result and date of each check.',
  },
]

export const kindLabel = (kind: ExportKind) =>
  EXPORT_KINDS.find((k) => k.value === kind)?.label ?? kind

const FILTER_LABELS: Record<string, string> = {
  q: 'Search',
  edition: 'Edition',
  country: 'Country',
  category: 'Category',
  emailStatus: 'Email status',
  aiStatus: 'AI status',
}

/** The filters of an export in one line, for the history table. */
export function describeFilters(filters: CompanyFilters): string {
  const parts: string[] = []
  for (const [key, raw] of Object.entries(filters)) {
    if (raw === undefined || raw === '' || key === 'sort') continue
    const value = String(raw)
    if (key === 'step') parts.push(`Step: ${STEP_LABEL[raw as keyof typeof STEP_LABEL] ?? value}`)
    else if (key === 'stepStatus')
      parts.push(
        `Step status: ${STEP_STATUS_META[raw as keyof typeof STEP_STATUS_META]?.label ?? value}`,
      )
    else if (key === 'hasContacts') parts.push(value === 'true' ? 'Has contacts' : 'No contacts')
    else if (key === 'duplicate') parts.push(value === 'true' ? 'Duplicates only' : 'No duplicates')
    else parts.push(`${FILTER_LABELS[key] ?? key}: ${value.replaceAll('_', ' ')}`)
  }
  return parts.length > 0 ? parts.join(' · ') : 'No filters'
}
