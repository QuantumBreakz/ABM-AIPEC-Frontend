import type {
  Company,
  CompanyListItem,
  EmailStatus,
  StepKey,
  StepState,
  StepStatus,
} from '@/api/types'
import { STEP_KEYS } from '@/api/types'

const SCORE: Record<StepStatus, number> = {
  completed: 1,
  approved: 1,
  partial: 0.5,
  not_started: 0,
  in_progress: 0,
  needs_review: 0,
  pending_access: 0,
  restricted: 0,
  failed: 0,
}

export function computeCompleteness(stages: Record<StepKey, StepState>) {
  const total = STEP_KEYS.reduce((sum, key) => sum + SCORE[stages[key].status], 0)
  return Math.round((100 * total) / STEP_KEYS.length)
}

export function countEmailsByStatus(company: Company) {
  const out: Partial<Record<EmailStatus, number>> = {}
  for (const contact of company.contacts) {
    for (const email of contact.emails) {
      out[email.verification.status] = (out[email.verification.status] ?? 0) + 1
    }
  }
  return out
}

/** Recompute the summary fields of a company after any change. */
export function refresh(company: Company, touch = false) {
  company.contactsCount = company.contacts.length
  company.emailsByStatus = countEmailsByStatus(company)
  company.aiStatus = company.ai.status
  company.completeness = computeCompleteness(company.stages)
  const latest = company.editions[0]
  company.country = latest?.country
  company.category = latest?.category
  company.stand = latest?.stand
  if (touch) company.updatedAt = new Date().toISOString()
  return company
}

export function toListItem(company: Company): CompanyListItem {
  return {
    id: company.id,
    name: company.name,
    domain: company.domain,
    country: company.country,
    category: company.category,
    stand: company.stand,
    editions: company.editions.map((e) => e.edition),
    stages: company.stages,
    contactsCount: company.contactsCount,
    emailsByStatus: company.emailsByStatus,
    aiStatus: company.aiStatus,
    duplicateOf: company.duplicateOf,
    completeness: company.completeness,
    updatedAt: company.updatedAt,
  }
}
