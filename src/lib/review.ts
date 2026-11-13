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
  website: 'Verify or assign official website',
  duplicate: 'Compare and merge matching companies',
  salesnav: 'Locate company in Sales Navigator',
  contacts: 'Add missing decision-maker contacts',
  emails: 'Review invalid or unverified addresses',
  ai: 'Approve or rewrite flagged drafts',
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
