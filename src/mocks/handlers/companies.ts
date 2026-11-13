import type {
  AiStatus,
  Company,
  CompanyListItem,
  Confidence,
  Coverage,
  EmailStatus,
  HistoryEntry,
  Paged,
  StepKey,
  StepStatus,
} from '@/api/types'
import { AI_STATUSES, COVERAGES, EMAIL_STATUSES, STEP_KEYS, STEP_STATUSES } from '@/api/types'
import { safeHttpUrl } from '@/lib/format'
import { settlePendingAi } from '../ai'
import { db, addHistory, findCompany } from '../db'
import { refresh, toListItem } from '../derive'
import { badRequest, json, noContent, notFound, paginate, requireString, route } from '../http'

// ---------- listing ----------
function oneOf<T extends string>(
  raw: string | null,
  allowed: readonly T[],
  name: string,
): T | undefined {
  if (raw === null || raw === '') return undefined
  if (!allowed.includes(raw as T))
    throw badRequest(`"${name}" must be one of: ${allowed.join(', ')}.`)
  return raw as T
}

function bool(raw: string | null, name: string): boolean | undefined {
  if (raw === null || raw === '') return undefined
  if (raw !== 'true' && raw !== 'false') throw badRequest(`"${name}" must be true or false.`)
  return raw === 'true'
}

const SORTS = ['name', '-name', 'updatedAt', '-updatedAt', 'completeness', '-completeness'] as const

/** Apply CompanyFilters from a query string. Shared with the CSV exports. */
export function filterCompanies(params: URLSearchParams): Company[] {
  const q = params.get('q')?.trim().toLowerCase()
  const editionRaw = params.get('edition')
  const edition = editionRaw ? Number(editionRaw) : undefined
  if (edition !== undefined && !Number.isInteger(edition))
    throw badRequest('"edition" must be a year.')
  const category = params.get('category')?.trim().toLowerCase()
  const country = params.get('country')?.trim().toLowerCase()
  const step = oneOf<StepKey>(params.get('step'), STEP_KEYS, 'step')
  const stepStatus = oneOf<StepStatus>(params.get('stepStatus'), STEP_STATUSES, 'stepStatus')
  const hasContacts = bool(params.get('hasContacts'), 'hasContacts')
  const emailStatus = oneOf<EmailStatus>(params.get('emailStatus'), EMAIL_STATUSES, 'emailStatus')
  const aiStatus = oneOf<AiStatus>(params.get('aiStatus'), AI_STATUSES, 'aiStatus')
  const duplicate = bool(params.get('duplicate'), 'duplicate')
  const sort = oneOf(params.get('sort'), SORTS, 'sort') ?? 'name'

  let items = db.companies.filter((c) => {
    if (q && !`${c.name} ${c.domain ?? ''} ${c.originalNames.join(' ')}`.toLowerCase().includes(q))
      return false
    if (edition !== undefined && !c.editions.some((e) => e.edition === edition)) return false
    if (category && !(c.category ?? '').toLowerCase().includes(category)) return false
    if (country && (c.country ?? '').toLowerCase() !== country) return false
    if (stepStatus) {
      const keys = step ? [step] : STEP_KEYS
      if (!keys.some((k) => c.stages[k].status === stepStatus)) return false
    }
    if (hasContacts !== undefined && c.contacts.length > 0 !== hasContacts) return false
    if (
      emailStatus &&
      !c.contacts.some((p) => p.emails.some((e) => e.verification.status === emailStatus))
    )
      return false
    if (aiStatus && c.ai.status !== aiStatus) return false
    if (duplicate !== undefined && !!c.duplicateOf !== duplicate) return false
    return true
  })

  const desc = sort.startsWith('-')
  const key = desc ? sort.slice(1) : sort
  items = [...items].sort((a, b) => {
    const cmp =
      key === 'name'
        ? a.name.localeCompare(b.name)
        : key === 'completeness'
          ? a.completeness - b.completeness
          : a.updatedAt.localeCompare(b.updatedAt)
    return desc ? -cmp : cmp
  })
  return items
}

// ---------- editing ----------
const EDITABLE: Record<string, (value: unknown) => unknown> = {
  'website.url': url,
  'website.summary': text,
  'website.services': stringList,
  'website.markets': stringList,
  'socials.linkedin': url,
  'socials.facebook': url,
  'socials.instagram': url,
  'socials.x': url,
  'socials.youtube': url,
  'socials.other': urlList,
  'salesNav.accountUrl': url,
  'salesNav.matchConfidence': (v) =>
    oneOfValue<Confidence>(v, ['high', 'medium', 'low'], 'matchConfidence'),
  leadershipCoverage: (v) => oneOfValue<Coverage>(v, COVERAGES, 'leadershipCoverage'),
}

function oneOfValue<T extends string>(
  value: unknown,
  allowed: readonly T[],
  name: string,
): T | undefined {
  if (value === null || value === '') return undefined
  if (!allowed.includes(value as T))
    throw badRequest(`"${name}" must be one of: ${allowed.join(', ')}.`)
  return value as T
}
function text(value: unknown) {
  if (value === null || value === '') return undefined
  if (typeof value !== 'string') throw badRequest('Expected text.')
  return value
}
function url(value: unknown) {
  if (value === null || value === '') return undefined
  if (typeof value !== 'string' || !safeHttpUrl(value))
    throw badRequest('Enter a full web address starting with http:// or https://.')
  return value
}
function stringList(value: unknown) {
  if (!Array.isArray(value) || value.some((v) => typeof v !== 'string'))
    throw badRequest('Expected a list of text values.')
  return value as string[]
}
function urlList(value: unknown) {
  return stringList(value).map((v) => url(v) as string)
}

/** Accept both {"website.url": x} and {website: {url: x}}. */
function flatten(input: Record<string, unknown>, prefix = ''): Record<string, unknown> {
  const out: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(input)) {
    const path = prefix ? `${prefix}.${key}` : key
    const isGroup = value !== null && typeof value === 'object' && !Array.isArray(value)
    if (isGroup && !(path in EDITABLE))
      Object.assign(out, flatten(value as Record<string, unknown>, path))
    else out[path] = value
  }
  return out
}

function getPath(target: object, path: string): unknown {
  return path
    .split('.')
    .reduce<unknown>((o, k) => (o as Record<string, unknown> | undefined)?.[k], target)
}
function setPath(target: object, path: string, value: unknown) {
  const keys = path.split('.')
  const last = keys.pop() as string
  const parent = keys.reduce<Record<string, unknown>>(
    (o, k) => o[k] as Record<string, unknown>,
    target as Record<string, unknown>,
  )
  if (value === undefined) delete parent[last]
  else parent[last] = value
}

export function getCompany(id: string | undefined): Company {
  const company = findCompany(id ?? '')
  if (!company) throw notFound('Company')
  return company
}

export const companyHandlers = [
  route.get('/companies', 'user', ({ url }) => {
    const all = filterCompanies(url.searchParams)
    const page = paginate(all, url)
    return json<Paged<CompanyListItem>>({ ...page, items: page.items.map(toListItem) })
  }),

  route.get('/companies/:id', 'user', ({ params }) => {
    settlePendingAi()
    return json<Company>(getCompany(params.id))
  }),

  route.patch('/companies/:id', 'user', async ({ params, body, user }) => {
    const company = getCompany(params.id)
    const input = flatten(await body())
    const entries = Object.entries(input)
    if (entries.length === 0) throw badRequest('Send at least one field to change.')
    for (const [field] of entries) {
      if (!(field in EDITABLE)) throw badRequest(`"${field}" cannot be edited.`)
    }
    // Validate everything first so a bad value changes nothing.
    const parsed = entries.map(
      ([field, value]) => [field, (EDITABLE[field] as (v: unknown) => unknown)(value)] as const,
    )
    for (const [field, value] of parsed) {
      const before = getPath(company, field)
      setPath(company, field, value)
      addHistory(company.id, field, before, value, user.email)
      if (!company.lockedFields.includes(field)) company.lockedFields.push(field)
    }
    refresh(company, true)
    return json<Company>(company)
  }),

  route.post('/companies/:id/steps/:step', 'user', async ({ params, body, user }) => {
    const company = getCompany(params.id)
    const step = params.step as StepKey
    if (!STEP_KEYS.includes(step)) throw badRequest(`Unknown step "${params.step}".`)
    const input = await body<{ status?: unknown; reason?: unknown }>()
    if (!STEP_STATUSES.includes(input.status as StepStatus)) {
      throw badRequest(`"status" must be one of: ${STEP_STATUSES.join(', ')}.`)
    }
    const reason = requireString(input.reason, 'reason')
    const before = company.stages[step]
    company.stages[step] = {
      status: input.status as StepStatus,
      reason,
      updatedAt: new Date().toISOString(),
    }
    addHistory(company.id, `stages.${step}`, before.status, input.status, user.email)
    refresh(company, true)
    return json<Company>(company)
  }),

  route.post('/companies/:id/merge', 'user', async ({ params, body, user }) => {
    const source = getCompany(params.id)
    const input = await body<{ intoId?: unknown }>()
    const intoId = requireString(input.intoId, 'intoId')
    if (intoId === source.id) throw badRequest('A company cannot be merged into itself.')
    const target = findCompany(intoId)
    if (!target) throw notFound('Target company')

    for (const contact of source.contacts) {
      const same = target.contacts.find(
        (c) =>
          c.firstName.toLowerCase() === contact.firstName.toLowerCase() &&
          c.lastName.toLowerCase() === contact.lastName.toLowerCase(),
      )
      if (!same) target.contacts.push({ ...contact, companyId: target.id })
    }
    for (const edition of source.editions) {
      if (!target.editions.some((e) => e.edition === edition.edition)) target.editions.push(edition)
    }
    target.editions.sort((a, b) => b.edition - a.edition)
    target.originalNames = [...new Set([...target.originalNames, ...source.originalNames])]
    // Anything that pointed at the merged company now points at the one we kept.
    for (const c of db.companies) if (c.duplicateOf === source.id) c.duplicateOf = target.id
    db.companies.splice(db.companies.indexOf(source), 1)
    addHistory(target.id, 'merge', source.name, target.name, user.email)
    refresh(target, true)
    return json<Company>(target)
  }),

  route.post('/companies/:id/not-duplicate', 'user', ({ params, user }) => {
    const company = getCompany(params.id)
    addHistory(company.id, 'duplicateOf', company.duplicateOf, undefined, user.email)
    company.duplicateOf = undefined
    if (!db.notDuplicate.includes(company.id)) db.notDuplicate.push(company.id)
    refresh(company, true)
    return json<Company>(company)
  }),

  route.get('/companies/:id/history', 'user', ({ params }) => {
    getCompany(params.id)
    return json<HistoryEntry[]>(db.history[params.id as string] ?? [])
  }),

  route.delete('/companies/:id', 'admin', ({ params }) => {
    const company = getCompany(params.id)
    db.companies.splice(db.companies.indexOf(company), 1)
    delete db.history[company.id]
    return noContent()
  }),
]
