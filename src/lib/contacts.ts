import type { Contact, Email } from '@/api/types'
import { formatExact } from './format'

/** Where a piece of contact information came from. Every email must have one (AT-06). */
export const PROVIDER_OPTIONS = [
  { value: 'manual', label: 'Entered by hand' },
  { value: 'salesnav', label: 'Sales Navigator (found by a person)' },
  { value: 'contactout', label: 'ContactOut' },
  { value: 'website', label: 'Company website' },
  { value: 'other', label: 'Other source' },
] as const

const SOURCE_LABELS: Record<string, string> = {
  ...Object.fromEntries(PROVIDER_OPTIONS.map((o) => [o.value, o.label])),
  csv_import: 'CSV import',
}

/** A readable name for a source such as "contactout". Unknown values are shown as they are. */
export const sourceLabel = (value: string | undefined) =>
  value ? (SOURCE_LABELS[value] ?? value) : undefined

export const SENIORITY_OPTIONS = ['CXO', 'VP', 'Director', 'Manager', 'Other'] as const

export const CONFIDENCE_OPTIONS = [
  { value: '', label: 'Not set' },
  { value: 'high', label: 'High' },
  { value: 'medium', label: 'Medium' },
  { value: 'low', label: 'Low' },
] as const

export const fullName = (c: Pick<Contact, 'firstName' | 'lastName'>) =>
  `${c.firstName} ${c.lastName}`.trim()

/** The same person, written the same way: names are compared ignoring case and spacing. */
export const sameName = (
  a: { firstName: string; lastName: string },
  b: { firstName: string; lastName: string },
) =>
  a.firstName.trim().toLowerCase() === b.firstName.trim().toLowerCase() &&
  a.lastName.trim().toLowerCase() === b.lastName.trim().toLowerCase()

/** What a hover on an email's status says: when it was checked and by what. Never implies a check that did not happen. */
export function verificationNote(email: Email): string | undefined {
  const { status, checkedAt, source } = email.verification
  if (status === 'not_checked') return 'No check has been run on this address yet.'
  const when = formatExact(checkedAt)
  if (!when && !source) return undefined
  return `Checked ${when ?? 'at an unknown time'}${source ? ` using ${source}` : ''}.`
}

export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
