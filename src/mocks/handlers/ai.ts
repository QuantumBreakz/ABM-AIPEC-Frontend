import type { AiPatch, AiVersion, CompanyAi, ContactAi } from '@/api/types'
import { COMPANY_AI_KEYS, CONTACT_AI_KEYS, queueRegeneration } from '../ai'
import { addHistory, findContact } from '../db'
import { refresh } from '../derive'
import { badRequest, conflict, json, notFound, requireString, route } from '../http'
import { getCompany } from './companies'

type AiLike = {
  status: CompanyAi['status']
  reason?: string
  evidenceUrls: string[]
  approved?: AiVersion
  versions: AiVersion[]
} & Record<string, unknown>

function currentFields(ai: AiLike, keys: string[]) {
  return Object.fromEntries(
    keys.map((k) => [k, typeof ai[k] === 'string' ? (ai[k] as string) : '']),
  )
}

/** Save / approve / reject. The approved copy is only ever replaced by approving again (FR-30). */
function applyAction(ai: AiLike, keys: string[], input: Partial<AiPatch>, by: string) {
  const at = new Date().toISOString()
  switch (input.action) {
    case 'save': {
      const fields = input.fields
      if (!fields || typeof fields !== 'object' || Object.keys(fields).length === 0) {
        throw badRequest('"fields" is required to save.')
      }
      for (const [k, v] of Object.entries(fields)) {
        if (!keys.includes(k)) throw badRequest(`"${k}" is not an editable field.`)
        if (typeof v !== 'string') throw badRequest(`"${k}" must be text.`)
      }
      const merged = { ...currentFields(ai, keys), ...fields }
      ai.versions.unshift({ fields: merged, by, at })
      Object.assign(ai, merged)
      ai.status = 'draft'
      ai.reason = undefined
      return
    }
    case 'approve': {
      if (ai.status === 'insufficient_evidence' || ai.status === 'pending') {
        throw conflict('There is no draft to approve. Add evidence or regenerate first.')
      }
      let version = ai.versions[0]
      if (!version) {
        version = { fields: currentFields(ai, keys), by, at }
        ai.versions.unshift(version)
      }
      ai.approved = { ...version, by, at }
      ai.status = 'approved'
      ai.reason = undefined
      return
    }
    case 'reject': {
      ai.reason = requireString(input.reason, 'reason')
      ai.status = 'rejected'
      return
    }
    default:
      throw badRequest('"action" must be save, approve or reject.')
  }
}

export const aiHandlers = [
  route.post('/companies/:id/ai/regenerate', 'user', ({ params }) => {
    getCompany(params.id)
    queueRegeneration('company', params.id as string)
    return json({ queued: true }, 202)
  }),

  route.patch('/companies/:id/ai', 'user', async ({ params, body, user }) => {
    const company = getCompany(params.id)
    const input = await body<Partial<AiPatch>>()
    applyAction(company.ai as unknown as AiLike, COMPANY_AI_KEYS, input, user.email)
    company.stages.personalization = {
      status: company.ai.status === 'approved' ? 'approved' : 'needs_review',
      reason: company.ai.reason,
      updatedAt: new Date().toISOString(),
    }
    addHistory(company.id, `ai.${input.action}`, undefined, company.ai.status, user.email)
    refresh(company, true)
    return json<CompanyAi>(company.ai)
  }),

  route.post('/contacts/:id/ai/regenerate', 'user', ({ params }) => {
    if (!findContact(params.id as string)) throw notFound('Contact')
    queueRegeneration('contact', params.id as string)
    return json({ queued: true }, 202)
  }),

  route.patch('/contacts/:id/ai', 'user', async ({ params, body, user }) => {
    const found = findContact(params.id as string)
    if (!found) throw notFound('Contact')
    const input = await body<Partial<AiPatch>>()
    applyAction(found.contact.ai as unknown as AiLike, CONTACT_AI_KEYS, input, user.email)
    found.contact.updatedAt = new Date().toISOString()
    addHistory(
      found.company.id,
      `contact:${found.contact.id}:ai.${input.action}`,
      undefined,
      found.contact.ai.status,
      user.email,
    )
    return json<ContactAi>(found.contact.ai)
  }),
]
