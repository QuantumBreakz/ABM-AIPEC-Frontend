import type { AiVersion, CompanyAi, ContactAi } from '@/api/types'

export type AiFieldDef = {
  key: string
  label: string
  kind: 'text' | 'textarea' | 'url'
  /** A soft guide from the requirements (PTC §5.1). It never blocks saving. */
  guide?: { min: number; max: number }
  hint?: string
}

export const COMPANY_FIELDS: AiFieldDef[] = [
  {
    key: 'summary',
    label: 'Company summary',
    kind: 'textarea',
    guide: { min: 2, max: 5 },
    hint: 'What the company does, in plain words, only from the evidence on the left.',
  },
  {
    key: 'signal',
    label: 'Signal',
    kind: 'textarea',
    hint: 'One recent, checkable thing that happened or was published.',
  },
  {
    key: 'signalUrl',
    label: 'Signal source',
    kind: 'url',
    hint: 'The page that shows the signal. Required.',
  },
  {
    key: 'hypothesis',
    label: 'Hypothesis',
    kind: 'textarea',
    hint: 'A guess to check, never stated as a known problem.',
  },
  {
    key: 'hyperPersonalization',
    label: 'Hyper-personalization',
    kind: 'textarea',
    guide: { min: 1, max: 3 },
    hint: 'The opening lines that refer to the signal.',
  },
]

export const CONTACT_FIELDS: AiFieldDef[] = [
  { key: 'subject', label: 'Email subject', kind: 'text' },
  { key: 'draft', label: 'Email draft', kind: 'textarea' },
  {
    key: 'linkedinDraft',
    label: 'LinkedIn message',
    kind: 'textarea',
    hint: 'You copy and send this yourself. The app never sends messages.',
  },
]

/** Count sentences roughly: text ending in . ! or ? . Good enough for a soft guide. */
export function countSentences(text: string): number {
  const trimmed = text.trim()
  if (!trimmed) return 0
  const parts = trimmed.split(/[.!?]+(?:\s+|$)/).filter((p) => p.trim().length > 0)
  return Math.max(parts.length, 1)
}

/** Says whether the text is inside the suggested range. `ok` is true when there is nothing to warn about. */
export function guideStatus(text: string, guide: { min: number; max: number }) {
  const count = countSentences(text)
  const label = `${count} ${count === 1 ? 'sentence' : 'sentences'}`
  const range = `suggested ${guide.min}–${guide.max}`
  return { count, ok: count === 0 || (count >= guide.min && count <= guide.max), label, range }
}

type AnyAi = CompanyAi | ContactAi

/** The fields of the current draft, as text. */
export function currentFields(ai: AnyAi, defs: AiFieldDef[]): Record<string, string> {
  const record = ai as unknown as Record<string, unknown>
  return Object.fromEntries(
    defs.map((d) => [d.key, typeof record[d.key] === 'string' ? (record[d.key] as string) : '']),
  )
}

/** True when the draft the person sees is not the approved copy. Exports keep using the approved one (FR-30). */
export function differsFromApproved(
  current: Record<string, string>,
  approved: AiVersion | undefined,
) {
  if (!approved) return false
  return Object.keys(current).some((k) => (approved.fields[k] ?? '') !== current[k])
}

/** Why a draft cannot be approved yet, or undefined when it can. */
export function approveBlocker(
  ai: AnyAi,
  fields: Record<string, string>,
  needsSignalSource: boolean,
): string | undefined {
  if (ai.status === 'pending') return 'There is no draft yet.'
  if (ai.status === 'insufficient_evidence')
    return 'There is not enough evidence. Write the text yourself and save it, or regenerate.'
  if (!Object.values(fields).some((v) => v.trim()))
    return 'The draft is empty. Write something and save it first.'
  if (needsSignalSource && fields.signal?.trim() && !fields.signalUrl?.trim())
    return 'The signal has no source. Add the page it comes from.'
  return undefined
}
