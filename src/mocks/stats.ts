import type {
  AiStatus,
  Company,
  EmailStatus,
  GapReport,
  Overview,
  StepKey,
  StepStatus,
} from '@/api/types'
import { AI_STATUSES, EMAIL_STATUSES, STEP_KEYS } from '@/api/types'
import { db } from './db'
import { badRequest } from './http'

export function resolveEdition(raw: string | null) {
  if (raw === null || raw === '') {
    const latest = Math.max(...db.events.map((e) => e.edition))
    return latest
  }
  const edition = Number(raw)
  if (!Number.isInteger(edition)) throw badRequest('"edition" must be a year, for example 2026.')
  return edition
}

export const inEdition = (edition: number) =>
  db.companies.filter((c) => c.editions.some((e) => e.edition === edition))

function byStep(companies: Company[]) {
  const out = {} as Record<StepKey, Partial<Record<StepStatus, number>>>
  for (const key of STEP_KEYS) {
    out[key] = {}
    for (const c of companies) {
      const s = c.stages[key].status
      out[key][s] = (out[key][s] ?? 0) + 1
    }
  }
  return out
}

export function buildOverview(edition: number): Overview {
  const companies = inEdition(edition)
  const emailsByStatus = Object.fromEntries(EMAIL_STATUSES.map((s) => [s, 0])) as Record<
    EmailStatus,
    number
  >
  const ai = Object.fromEntries(AI_STATUSES.map((s) => [s, 0])) as Record<AiStatus, number>
  let contacts = 0
  for (const c of companies) {
    contacts += c.contacts.length
    ai[c.ai.status] += 1
    for (const contact of c.contacts) {
      for (const email of contact.emails) emailsByStatus[email.verification.status] += 1
    }
  }
  const duplicates = companies.filter((c) => c.duplicateOf).length
  return {
    edition,
    advertised: db.events.find((e) => e.edition === edition)?.advertisedCount,
    discovered: companies.length,
    unique: companies.length - duplicates,
    duplicates,
    byStep: byStep(companies),
    contacts,
    companiesWithContacts: companies.filter((c) => c.contacts.length > 0).length,
    emailsByStatus,
    ai,
    failures: companies.filter((c) => STEP_KEYS.some((k) => c.stages[k].status === 'failed'))
      .length,
  }
}

const BLOCKED: StepStatus[] = ['failed', 'restricted', 'pending_access', 'needs_review']

export function buildGapReport(edition: number): GapReport {
  const companies = inEdition(edition)
  const overview = buildOverview(edition)
  const blocked: GapReport['blocked'] = []
  for (const c of companies) {
    for (const key of STEP_KEYS) {
      const state = c.stages[key]
      if (BLOCKED.includes(state.status)) {
        blocked.push({
          companyId: c.id,
          companyName: c.name,
          step: key,
          status: state.status,
          reason: state.reason,
        })
      }
    }
  }
  const allEmails = companies.flatMap((c) => c.contacts.flatMap((p) => p.emails))
  return {
    edition,
    generatedAt: new Date().toISOString(),
    advertised: overview.advertised,
    discovered: overview.discovered,
    researched: companies.filter((c) =>
      ['completed', 'partial', 'approved'].includes(c.stages.website.status),
    ).length,
    contactsFound: overview.contacts,
    emailsChecked: allEmails.filter((e) => e.verification.status !== 'not_checked').length,
    aiDone: companies.filter((c) => c.ai.status === 'draft' || c.ai.status === 'approved').length,
    byStep: overview.byStep,
    blocked,
  }
}
