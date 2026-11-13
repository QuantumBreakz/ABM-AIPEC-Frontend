import type { Company } from '@/api/types'
import { safeHttpUrl } from './format'

/** The company fields a person may edit (the dotted names the backend accepts). */
export type EditableField =
  | 'website.url'
  | 'website.summary'
  | 'website.services'
  | 'website.markets'
  | 'socials.linkedin'
  | 'socials.facebook'
  | 'socials.instagram'
  | 'socials.x'
  | 'socials.youtube'
  | 'socials.other'
  | 'salesNav.accountUrl'
  | 'salesNav.matchConfidence'
  | 'leadershipCoverage'

/** `null` clears a value. */
export type CompanyPatch = Partial<Record<EditableField, string | string[] | null>>

function setPath(target: Record<string, unknown>, path: string, value: unknown) {
  const keys = path.split('.')
  const last = keys.pop() as string
  let node = target
  for (const key of keys) node = node[key] as Record<string, unknown>
  if (value === undefined) delete node[last]
  else node[last] = value
}

/**
 * What the company will look like once the server accepts the patch. The screen shows this
 * straight away (an "optimistic" update) and the server's answer replaces it a moment later.
 * Edited fields are marked as locked, exactly as the server does.
 */
export function applyPatch(company: Company, patch: CompanyPatch): Company {
  const next = structuredClone(company)
  for (const [field, value] of Object.entries(patch)) {
    setPath(next as unknown as Record<string, unknown>, field, value === null ? undefined : value)
    if (!next.lockedFields.includes(field)) next.lockedFields.push(field)
  }
  return next
}

// ---------- validation (the server checks again; this gives an instant, friendly message) ----------
export const URL_MESSAGE = 'Enter a full web address starting with http:// or https://.'

export function validateUrl(value: string | string[] | undefined): string | undefined {
  if (value === undefined) return undefined // empty means "clear it"
  const text = Array.isArray(value) ? value : [value]
  const bad = text.find((v) => !safeHttpUrl(v))
  return bad === undefined ? undefined : URL_MESSAGE
}
