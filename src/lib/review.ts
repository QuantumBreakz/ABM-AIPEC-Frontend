import type { ReviewType } from '@/api/types'
import { REVIEW_TYPES } from '@/api/types'

export const REVIEW_LABEL: Record<ReviewType, string> = {
  website: 'Website',
  duplicate: 'Duplicates',
  salesnav: 'Sales Navigator',
  contacts: 'Contacts',
  emails: 'Emails',
  ai: 'AI drafts',
}

export const REVIEW_DESCRIPTION: Record<ReviewType, string> = {
  website:
    'Companies whose website could not be read, or where a person has to choose the right one.',
  duplicate:
    'Records that look like the same company. Compare them, then merge or mark them as different.',
  salesnav: 'Companies waiting for someone to find them in Sales Navigator.',
  contacts: 'Companies with no decision-makers saved after review.',
  emails: 'Email addresses that are invalid, risky or could not be confirmed.',
  ai: 'Drafts that were rejected or that did not have enough evidence to write.',
}

export const isReviewType = (value: string | undefined): value is ReviewType =>
  REVIEW_TYPES.includes(value as ReviewType)

/** Where on the company page a review item of this kind is worked on. */
export const REVIEW_TAB: Record<ReviewType, 'website' | 'contacts' | 'ai' | undefined> = {
  website: 'website',
  duplicate: undefined,
  salesnav: 'contacts',
  contacts: 'contacts',
  emails: 'contacts',
  ai: 'ai',
}

/** A stable key for one queue row (the same company can appear for several contacts). */
export const reviewKey = (item: { companyId: string; contactId?: string }) =>
  `${item.companyId}:${item.contactId ?? ''}`
