import type { AiVersion, Company } from '@/api/types'
import { refresh } from './derive'
import { db, findCompany, findContact } from './db'
import { mockConfig } from './config'

export const COMPANY_AI_KEYS = [
  'summary',
  'signal',
  'signalUrl',
  'hypothesis',
  'hyperPersonalization',
]
export const CONTACT_AI_KEYS = ['subject', 'draft', 'linkedinDraft']

/** Queue a regeneration. Without a language model nothing is invented: it stays Pending (FR-31). */
export function queueRegeneration(kind: 'company' | 'contact', id: string) {
  const target = kind === 'company' ? findCompany(id) : findContact(id)?.contact
  if (!target) return
  const ai = target.ai
  if (!db.providers.llm) {
    ai.status = 'pending'
    ai.reason = 'No language model is available, so no draft was generated.'
    return
  }
  ai.status = 'pending'
  ai.reason = 'Generating a new draft…'
  db.pendingAi = db.pendingAi.filter((p) => !(p.kind === kind && p.id === id))
  db.pendingAi.push({ kind, id, readyAt: Date.now() + mockConfig.aiDelayMs })
  if (kind === 'company') {
    const company = target as Company
    company.stages.personalization = { status: 'in_progress', updatedAt: new Date().toISOString() }
    refresh(company, true)
  }
}

function hasFacts(company: Company) {
  return company.website.facts.some((f) => f.kind === 'fact')
}

/** Finish queued regenerations whose time has come. Called whenever a company is read. */
export function settlePendingAi() {
  const now = Date.now()
  const due = db.pendingAi.filter((p) => p.readyAt <= now)
  if (due.length === 0) return
  db.pendingAi = db.pendingAi.filter((p) => p.readyAt > now)

  for (const item of due) {
    const at = new Date().toISOString()
    if (item.kind === 'company') {
      const company = findCompany(item.id)
      if (!company) continue
      const ai = company.ai
      if (!hasFacts(company)) {
        ai.status = 'insufficient_evidence'
        ai.reason = 'No sourced company fact is available to cite, so no draft was written.'
        company.stages.personalization = {
          status: 'needs_review',
          reason: ai.reason,
          updatedAt: at,
        }
      } else {
        const n = ai.versions.length + 1
        const fact = company.website.facts.find((f) => f.kind === 'fact')
        const fields: Record<string, string> = {
          summary:
            `${company.name} (regenerated draft ${n}). ${company.website.summary ?? ''}`.trim(),
          signal: fact?.text ?? '',
          signalUrl: fact?.sourceUrl ?? '',
          hypothesis:
            'Possibly coordinating work across several tools. A guess to check, not a known problem.',
          hyperPersonalization: `Noticed: ${fact?.text ?? ''} Curious how your teams share information day to day.`,
        }
        const v: AiVersion = { fields, by: 'ai', at }
        ai.versions.unshift(v)
        Object.assign(ai, fields)
        ai.evidenceUrls = fact ? [fact.sourceUrl] : []
        ai.status = 'draft'
        ai.reason = undefined
        company.stages.personalization = { status: 'needs_review', updatedAt: at }
      }
      refresh(company, true)
    } else {
      const found = findContact(item.id)
      if (!found) continue
      const { company, contact } = found
      const ai = contact.ai
      if (!hasFacts(company)) {
        ai.status = 'insufficient_evidence'
        ai.reason = 'Not enough sourced facts about this company.'
      } else {
        const n = ai.versions.length + 1
        const fact = company.website.facts.find((f) => f.kind === 'fact')
        const fields: Record<string, string> = {
          subject: `Question about ${company.name} (v${n})`,
          draft: `Hello ${contact.firstName},\n\nI read that ${fact?.text ?? ''} How do your teams share information today?\n\nBest regards`,
          linkedinDraft: `Hi ${contact.firstName}, I read about ${company.name} and had a question.`,
        }
        ai.versions.unshift({ fields, by: 'ai', at })
        Object.assign(ai, fields)
        ai.evidenceUrls = fact ? [fact.sourceUrl] : []
        ai.status = 'draft'
        ai.reason = undefined
      }
      contact.updatedAt = at
    }
  }
}
