import type { Paged, ReviewItem, ReviewType } from '@/api/types'
import { REVIEW_TYPES } from '@/api/types'
import { db } from '../db'
import { badRequest, json, paginate, route } from '../http'

/**
 * The review queue is worked out from the data, so resolving something (editing a field,
 * merging, adding a contact, approving a draft…) removes it from the queue by itself.
 */
export function reviewItems(type: ReviewType): ReviewItem[] {
  const items: ReviewItem[] = []
  for (const c of db.companies) {
    const base = { type, companyId: c.id, companyName: c.name }
    switch (type) {
      case 'website': {
        const s = c.stages.website
        if (s.status === 'needs_review' || s.status === 'failed') {
          items.push({
            ...base,
            reason: s.reason ?? 'Website needs a person to check it.',
            since: s.updatedAt ?? c.updatedAt,
          })
        }
        break
      }
      case 'duplicate': {
        if (c.duplicateOf) {
          const other = db.companies.find((x) => x.id === c.duplicateOf)
          items.push({
            ...base,
            reason: `Possible duplicate of ${other?.name ?? c.duplicateOf}.`,
            since: c.updatedAt,
          })
        }
        break
      }
      case 'salesnav': {
        const s = c.stages.account
        if (!c.duplicateOf && (s.status === 'pending_access' || s.status === 'needs_review')) {
          items.push({
            ...base,
            reason: s.reason ?? 'Find this company in Sales Navigator.',
            since: s.updatedAt ?? c.updatedAt,
          })
        }
        break
      }
      case 'contacts': {
        const s = c.stages.people
        if (c.contacts.length === 0 && (s.status === 'needs_review' || s.status === 'partial')) {
          items.push({
            ...base,
            reason: s.reason ?? 'No contacts found yet.',
            since: s.updatedAt ?? c.updatedAt,
          })
        }
        break
      }
      case 'emails': {
        for (const p of c.contacts) {
          for (const e of p.emails) {
            const status = e.verification.status
            if (status === 'invalid' || status === 'risky' || status === 'unknown') {
              items.push({
                ...base,
                contactId: p.id,
                contactName: `${p.firstName} ${p.lastName}`,
                reason: `${e.address} is ${status}.`,
                since: e.verification.checkedAt ?? e.capturedAt,
              })
            }
          }
        }
        break
      }
      case 'ai': {
        if (c.ai.status === 'insufficient_evidence' || c.ai.status === 'rejected') {
          items.push({
            ...base,
            reason: c.ai.reason ?? 'Company draft needs attention.',
            since: c.updatedAt,
          })
        }
        for (const p of c.contacts) {
          if (p.ai.status === 'insufficient_evidence' || p.ai.status === 'rejected') {
            items.push({
              ...base,
              contactId: p.id,
              contactName: `${p.firstName} ${p.lastName}`,
              reason: p.ai.reason ?? 'Contact draft needs attention.',
              since: p.updatedAt,
            })
          }
        }
        break
      }
    }
  }
  return items.sort((a, b) => b.since.localeCompare(a.since))
}

export const reviewHandlers = [
  route.get('/review/counts', 'user', () =>
    json<Record<ReviewType, number>>(
      Object.fromEntries(REVIEW_TYPES.map((t) => [t, reviewItems(t).length])) as Record<
        ReviewType,
        number
      >,
    ),
  ),

  route.get('/review', 'user', ({ url }) => {
    const type = url.searchParams.get('type') as ReviewType | null
    if (!type || !REVIEW_TYPES.includes(type)) {
      throw badRequest(`"type" must be one of: ${REVIEW_TYPES.join(', ')}.`)
    }
    return json<Paged<ReviewItem>>(paginate(reviewItems(type), url))
  }),
]
