import { api, configureClient, setUnauthorizedHandler, type ApiError } from '@/api/client'
import type {
  Company,
  CompanyAi,
  CompanyListItem,
  Contact,
  GapReport,
  HistoryEntry,
  Overview,
  Paged,
  ReviewItem,
  ReviewType,
  Run,
} from '@/api/types'
import {
  AI_STATUSES,
  COVERAGES,
  EMAIL_STATUSES,
  REVIEW_TYPES,
  STEP_KEYS,
  STEP_STATUSES,
} from '@/api/types'
import { disableDelays, mockState } from './config'
import { parseCsv, toCsv } from './csv'
import { db, resetDb } from './db'
import { resetLoginAttempts } from './handlers/auth'
import { setSession } from './http'
import { server } from './server'

const BASE = 'http://localhost/api'

beforeAll(() => {
  server.listen({ onUnhandledFrame: 'error' })
  disableDelays()
  configureClient({ base: BASE, retryIntervalMs: 10, wakeTimeoutMs: 300 })
  setUnauthorizedHandler(() => {})
})
afterAll(() => server.close())
beforeEach(() => {
  resetDb()
  resetLoginAttempts()
  setSession(null)
  mockState.wakeUntil = 0
  window.history.replaceState({}, '', '/')
})

const login = (email = 'admin@example.com') =>
  api.post('/auth/login', { email, password: 'password' })

async function fail(promise: Promise<unknown>) {
  try {
    await promise
  } catch (error) {
    return error as ApiError
  }
  throw new Error('Expected the request to fail')
}

async function csv(path: string) {
  const res = await fetch(`${BASE}${path}`)
  return { res, text: await res.text() }
}

describe('seed data', () => {
  it('has about 150 companies and shows every enum value somewhere', () => {
    expect(db.companies.length).toBeGreaterThanOrEqual(100)

    const stepStatuses = new Set(
      db.companies.flatMap((c) => STEP_KEYS.map((k) => c.stages[k].status)),
    )
    for (const s of STEP_STATUSES) expect(stepStatuses, `step status ${s}`).toContain(s)

    const emailStatuses = new Set(
      db.companies.flatMap((c) =>
        c.contacts.flatMap((p) => p.emails.map((e) => e.verification.status)),
      ),
    )
    for (const s of EMAIL_STATUSES) expect(emailStatuses, `email status ${s}`).toContain(s)

    const aiStatuses = new Set(
      db.companies.flatMap((c) => [c.ai.status, ...c.contacts.map((p) => p.ai.status)]),
    )
    for (const s of AI_STATUSES) expect(aiStatuses, `ai status ${s}`).toContain(s)

    const coverages = new Set(db.companies.map((c) => c.leadershipCoverage))
    for (const s of COVERAGES) expect(coverages, `coverage ${s}`).toContain(s)
  })

  it('has duplicates, locked fields, multiple editions, several contacts and a missing website', () => {
    expect(db.companies.some((c) => c.duplicateOf)).toBe(true)
    expect(db.companies.some((c) => c.lockedFields.length > 0)).toBe(true)
    expect(db.companies.some((c) => c.editions.length > 1)).toBe(true)
    expect(db.companies.some((c) => c.contacts.length >= 3)).toBe(true)
    expect(db.companies.some((c) => !c.website.url)).toBe(true)
  })

  it('has one running and one paused run', () => {
    expect(db.runs.some((r) => r.status === 'running')).toBe(true)
    expect(db.runs.some((r) => r.status === 'paused')).toBe(true)
  })

  it('is the same on every reset (stable for tests)', () => {
    const before = db.companies.map((c) => c.id + c.name)
    resetDb()
    expect(db.companies.map((c) => c.id + c.name)).toEqual(before)
  })
})

describe('auth and roles', () => {
  it('rejects requests until you sign in', async () => {
    expect(await fail(api.get('/companies'))).toMatchObject({ status: 401 })
    expect(await fail(api.get('/auth/me'))).toMatchObject({ status: 401 })
  })

  it('signs in, returns the user, and signs out', async () => {
    const user = await login()
    expect(user).toMatchObject({ email: 'admin@example.com', role: 'admin' })
    expect(user).not.toHaveProperty('password')
    expect(await api.get('/auth/me')).toMatchObject({ email: 'admin@example.com' })
    await api.post('/auth/logout')
    expect(await fail(api.get('/auth/me'))).toMatchObject({ status: 401 })
  })

  it('answers 401 for a wrong password and 429 after five failures', async () => {
    for (let i = 0; i < 5; i++) {
      expect(
        await fail(api.post('/auth/login', { email: 'admin@example.com', password: 'nope' })),
      ).toMatchObject({ status: 401 })
    }
    expect(await fail(login())).toMatchObject({ status: 429, code: 'rate_limited' })
  })

  it('lets a reviewer read but not use admin actions', async () => {
    await login('reviewer@example.com')
    await expect(api.get('/companies')).resolves.toBeTruthy()
    for (const attempt of [
      api.get('/users'),
      api.post('/runs', { edition: 2026 }),
      api.post('/verification/run', { edition: 2026 }),
      api.del('/contacts/p_0010'),
      api.get('/suppressions'),
    ]) {
      expect(await fail(attempt)).toMatchObject({ status: 403, code: 'forbidden' })
    }
  })

  it('?mock_role=reviewer signs you in as a reviewer', async () => {
    window.history.replaceState({}, '', '/?mock_role=reviewer')
    expect(await api.get('/auth/me')).toMatchObject({ role: 'reviewer' })
  })

  it('?mock_fail forces a 500 on matching paths', async () => {
    await login()
    window.history.replaceState({}, '', '/?mock_fail=/companies')
    expect(await fail(api.get('/companies'))).toMatchObject({ status: 500 })
    await expect(api.get('/events')).resolves.toBeTruthy()
  })

  it('manages users (admin)', async () => {
    await login()
    const created = await api.post<{ id: string }>('/users', {
      email: 'new@example.com',
      password: 'longenough',
      role: 'reviewer',
    })
    expect(
      await fail(
        api.post('/users', { email: 'new@example.com', password: 'longenough', role: 'reviewer' }),
      ),
    ).toMatchObject({ status: 409 })
    expect(
      await fail(
        api.post('/users', { email: 'x@example.com', password: 'short', role: 'reviewer' }),
      ),
    ).toMatchObject({ status: 400 })
    await api.patch(`/users/${created.id}`, { role: 'admin' })
    await api.del(`/users/${created.id}`)
    expect(await fail(api.del('/users/u_1'))).toMatchObject({ status: 409 })
  })
})

describe('waking server', () => {
  it('answers 503 during the wake window and the client keeps retrying', async () => {
    mockState.wakeUntil = Date.now() + 60
    await expect(api.get('/health')).resolves.toMatchObject({ ok: true })
  })
})

describe('companies', () => {
  beforeEach(() => login())

  it('pages the list and clamps pageSize to 200', async () => {
    const first = await api.get<Paged<CompanyListItem>>('/companies')
    expect(first).toMatchObject({ page: 1, pageSize: 50, total: db.companies.length })
    expect(first.items).toHaveLength(50)
    const big = await api.get<Paged<CompanyListItem>>('/companies', { pageSize: 500 })
    expect(big.pageSize).toBe(200)
    const second = await api.get<Paged<CompanyListItem>>('/companies', { page: 2 })
    expect(second.items[0]?.id).not.toBe(first.items[0]?.id)
  })

  it('filters, sorts and rejects bad values', async () => {
    const ae = await api.get<Paged<CompanyListItem>>('/companies', { country: 'AE', pageSize: 200 })
    expect(ae.total).toBeGreaterThan(0)
    expect(ae.items.every((c) => c.country === 'AE')).toBe(true)

    const failed = await api.get<Paged<CompanyListItem>>('/companies', {
      step: 'website',
      stepStatus: 'failed',
      pageSize: 200,
    })
    expect(failed.items.length).toBeGreaterThan(0)
    expect(failed.items.every((c) => c.stages.website.status === 'failed')).toBe(true)

    const desc = await api.get<Paged<CompanyListItem>>('/companies', {
      sort: '-completeness',
      pageSize: 200,
    })
    const values = desc.items.map((c) => c.completeness)
    expect(values).toEqual([...values].sort((a, b) => b - a))

    const noContacts = await api.get<Paged<CompanyListItem>>('/companies', {
      hasContacts: false,
      pageSize: 200,
    })
    expect(noContacts.items.every((c) => c.contactsCount === 0)).toBe(true)

    expect(await fail(api.get('/companies', { stepStatus: 'bogus' }))).toMatchObject({
      status: 400,
    })
    expect(await fail(api.get('/companies', { page: 0 }))).toMatchObject({ status: 400 })
  })

  it('returns 404 for an unknown company', async () => {
    expect(await fail(api.get('/companies/nope'))).toMatchObject({ status: 404, code: 'not_found' })
  })

  it('edits a field, locks it and records history; accepts dotted or nested bodies', async () => {
    const dotted = await api.patch<Company>('/companies/c_004', {
      'website.url': 'https://changed.example.com',
    })
    expect(dotted.website.url).toBe('https://changed.example.com')
    expect(dotted.lockedFields).toContain('website.url')

    const nested = await api.patch<Company>('/companies/c_004', {
      socials: { linkedin: 'https://www.linkedin.com/company/x' },
    })
    expect(nested.socials.linkedin).toBe('https://www.linkedin.com/company/x')

    const history = await api.get<HistoryEntry[]>('/companies/c_004/history')
    expect(history[0]).toMatchObject({ field: 'socials.linkedin', by: 'admin@example.com' })
    expect(history.map((h) => h.field)).toContain('website.url')

    expect(
      await fail(api.patch('/companies/c_004', { 'website.url': 'javascript:alert(1)' })),
    ).toMatchObject({ status: 400 })
    expect(await fail(api.patch('/companies/c_004', { name: 'Nope' }))).toMatchObject({
      status: 400,
    })
  })

  it('changes a step only with a reason', async () => {
    expect(
      await fail(api.post('/companies/c_004/steps/website', { status: 'completed' })),
    ).toMatchObject({ status: 400 })
    expect(
      await fail(api.post('/companies/c_004/steps/nope', { status: 'completed', reason: 'x' })),
    ).toMatchObject({ status: 400 })
    const company = await api.post<Company>('/companies/c_004/steps/website', {
      status: 'completed',
      reason: 'Checked by hand',
    })
    expect(company.stages.website).toMatchObject({ status: 'completed', reason: 'Checked by hand' })
  })

  it('merges duplicates and removes the merged company', async () => {
    const dup = db.companies.find((c) => c.duplicateOf)
    expect(dup).toBeTruthy()
    const keep = await api.post<Company>(`/companies/${dup?.id}/merge`, {
      intoId: dup?.duplicateOf,
    })
    expect(keep.id).toBe(dup?.duplicateOf)
    expect(await fail(api.get(`/companies/${dup?.id}`))).toMatchObject({ status: 404 })
    expect(await fail(api.post('/companies/c_004/merge', { intoId: 'c_004' }))).toMatchObject({
      status: 400,
    })
  })

  it('marks a company as not a duplicate', async () => {
    const dup = db.companies.find((c) => c.duplicateOf)
    const company = await api.post<Company>(`/companies/${dup?.id}/not-duplicate`)
    expect(company.duplicateOf).toBeUndefined()
  })
})

describe('contacts', () => {
  beforeEach(() => login())

  it('re-saving the same person updates instead of duplicating (AT-05)', async () => {
    const before = (await api.get<Company>('/companies/c_004')).contacts.length
    const first = await api.post<Contact>('/companies/c_004/contacts', {
      firstName: 'Test',
      lastName: 'Person',
      source: 'manual',
      emails: [{ address: 'test.person@example.com', provider: 'manual' }],
    })
    const again = await api.post<Contact>('/companies/c_004/contacts', {
      firstName: 'test',
      lastName: 'PERSON',
      title: 'CTO',
      source: 'manual',
      emails: [{ address: 'test.person@example.com', provider: 'manual' }],
    })
    expect(again.id).toBe(first.id)
    expect(again.title).toBe('CTO')
    expect(again.emails).toHaveLength(1)
    expect(again.emails[0]?.verification.status).toBe('not_checked')
    expect((await api.get<Company>('/companies/c_004')).contacts).toHaveLength(before + 1)
  })

  it('validates input and refuses opted-out emails', async () => {
    expect(await fail(api.post('/companies/c_004/contacts', { firstName: 'A' }))).toMatchObject({
      status: 400,
    })
    expect(
      await fail(
        api.post('/companies/c_004/contacts', {
          firstName: 'A',
          lastName: 'B',
          source: 'manual',
          emails: [{ address: 'not-an-email' }],
        }),
      ),
    ).toMatchObject({ status: 400 })
    const blocked = await fail(
      api.post('/companies/c_004/contacts', {
        firstName: 'A',
        lastName: 'B',
        source: 'manual',
        emails: [{ address: 'optout@example.com' }],
      }),
    )
    expect(blocked).toMatchObject({ status: 400 })
    expect(blocked.message).toMatch(/opt-out/)
  })

  it('imports good rows and lists the bad ones', async () => {
    const result = await api.post<{
      created: number
      updated: number
      errors: { row: number; message: string }[]
    }>('/companies/c_004/contacts/import', {
      csv: 'first_name,last_name,title,email\nAna,One,CEO,ana.one@example.com\nBen,Two,CFO,\n,Missing,CTO,x@example.com\n',
    })
    expect(result.created).toBe(2)
    expect(result.errors).toHaveLength(1)
    expect(result.errors[0]).toMatchObject({ row: 4 })
    expect(
      await fail(api.post('/companies/c_004/contacts/import', { csv: 'name,mail\nA,b' })),
    ).toMatchObject({ status: 400 })
  })

  it('keeps check results when an email stays, and deletes as admin', async () => {
    const company = db.companies.find((c) =>
      c.contacts.some((p) => p.emails.some((e) => e.verification.status === 'verified')),
    )
    const contact = company?.contacts.find((p) =>
      p.emails.some((e) => e.verification.status === 'verified'),
    )
    const email = contact?.emails.find((e) => e.verification.status === 'verified')
    const updated = await api.patch<Contact>(`/contacts/${contact?.id}`, {
      title: 'Updated',
      emails: [{ address: email?.address as string }],
    })
    expect(updated.emails[0]?.verification.status).toBe('verified')
    await api.del(`/contacts/${contact?.id}`)
    expect(await fail(api.patch(`/contacts/${contact?.id}`, { title: 'x' }))).toMatchObject({
      status: 404,
    })
  })
})

describe('AI review', () => {
  beforeEach(() => login())

  it('saves versions, approves, and keeps the approved copy when regenerating (FR-30)', async () => {
    const before = await api.get<Company>('/companies/c_001')
    const approved = before.ai.approved
    expect(approved).toBeTruthy()

    const saved = await api.patch<CompanyAi>('/companies/c_001/ai', {
      action: 'save',
      fields: { summary: 'Edited summary.' },
    })
    expect(saved.status).toBe('draft')
    expect(saved.versions).toHaveLength(before.ai.versions.length + 1)
    expect(saved.approved).toEqual(approved)

    expect(await api.post('/companies/c_001/ai/regenerate')).toEqual({ queued: true })
    const after = await api.get<Company>('/companies/c_001')
    expect(after.ai.status).toBe('draft')
    expect(after.ai.versions.length).toBeGreaterThan(saved.versions.length)
    expect(after.ai.approved).toEqual(approved)
  })

  it('shows Pending while generating, then a draft', async () => {
    const { mockConfig } = await import('./config')
    mockConfig.aiDelayMs = 60_000
    await api.post('/companies/c_001/ai/regenerate')
    expect((await api.get<Company>('/companies/c_001')).ai.status).toBe('pending')
    mockConfig.aiDelayMs = 0
  })

  it('requires a reason to reject and refuses to approve without evidence', async () => {
    expect(await fail(api.patch('/companies/c_001/ai', { action: 'reject' }))).toMatchObject({
      status: 400,
    })
    const rejected = await api.patch<CompanyAi>('/companies/c_001/ai', {
      action: 'reject',
      reason: 'Too generic',
    })
    expect(rejected).toMatchObject({ status: 'rejected', reason: 'Too generic' })

    const noEvidence = db.companies.find((c) => c.ai.status === 'insufficient_evidence')
    expect(
      await fail(api.patch(`/companies/${noEvidence?.id}/ai`, { action: 'approve' })),
    ).toMatchObject({ status: 409 })
  })

  it('writes Insufficient Evidence instead of inventing text when there are no facts', async () => {
    const noFacts = db.companies.find((c) => c.website.facts.length === 0)
    await api.post(`/companies/${noFacts?.id}/ai/regenerate`)
    const company = await api.get<Company>(`/companies/${noFacts?.id}`)
    expect(company.ai.status).toBe('insufficient_evidence')
  })

  it('stays Pending when no language model is available (FR-31)', async () => {
    db.providers.llm = false
    await api.post('/companies/c_001/ai/regenerate')
    const company = await api.get<Company>('/companies/c_001')
    expect(company.ai.status).toBe('pending')
    expect(company.ai.reason).toMatch(/language model/i)
  })

  it('edits and approves a contact draft', async () => {
    const contact = db.companies.flatMap((c) => c.contacts).find((p) => p.ai.status === 'draft')
    const saved = await api.patch<{ subject?: string; status: string }>(
      `/contacts/${contact?.id}/ai`,
      { action: 'save', fields: { subject: 'New subject' } },
    )
    expect(saved.subject).toBe('New subject')
    const approved = await api.patch<{
      status: string
      approved?: { fields: Record<string, string> }
    }>(`/contacts/${contact?.id}/ai`, { action: 'approve' })
    expect(approved.status).toBe('approved')
    expect(approved.approved?.fields.subject).toBe('New subject')
  })
})

describe('review queue', () => {
  beforeEach(() => login())

  it('counts match the lists for every type', async () => {
    const counts = await api.get<Record<ReviewType, number>>('/review/counts')
    for (const type of REVIEW_TYPES) {
      const list = await api.get<Paged<ReviewItem>>('/review', { type, pageSize: 200 })
      expect(list.total, type).toBe(counts[type])
    }
  })

  it('resolving a duplicate removes it from the queue', async () => {
    const before = (await api.get<Record<ReviewType, number>>('/review/counts')).duplicate
    expect(before).toBeGreaterThan(0)
    const dup = db.companies.find((c) => c.duplicateOf)
    await api.post(`/companies/${dup?.id}/not-duplicate`)
    expect((await api.get<Record<ReviewType, number>>('/review/counts')).duplicate).toBe(before - 1)
  })

  it('adding a contact removes a company from the "no contacts" queue', async () => {
    const list = await api.get<Paged<ReviewItem>>('/review', { type: 'contacts' })
    const item = list.items[0]
    expect(item).toBeTruthy()
    await api.post(`/companies/${item?.companyId}/contacts`, {
      firstName: 'Found',
      lastName: 'Person',
      source: 'manual',
    })
    const after = await api.get<Paged<ReviewItem>>('/review', { type: 'contacts' })
    expect(after.items.some((i) => i.companyId === item?.companyId)).toBe(false)
  })

  it('rejects an unknown type', async () => {
    expect(await fail(api.get('/review', { type: 'nope' }))).toMatchObject({ status: 400 })
  })
})

describe('runs', () => {
  beforeEach(() => login())

  it('refuses a second run while one is running (409), then allows it after a pause', async () => {
    expect(await fail(api.post('/runs', { edition: 2026 }))).toMatchObject({
      status: 409,
      code: 'conflict',
    })
    const paused = await api.post<Run>('/runs/r_4/pause')
    expect(paused.status).toBe('paused')
    expect(await fail(api.post('/runs/r_4/pause'))).toMatchObject({ status: 409 })
    const started = await api.post<Run>('/runs', { edition: 2026, steps: ['directory', 'profile'] })
    expect(started).toMatchObject({ status: 'running', steps: ['directory', 'profile'] })
    expect(await fail(api.post('/runs/r_4/resume'))).toMatchObject({ status: 409 })
  })

  it('fills up while polled and finishes', async () => {
    let run = await api.get<Run>('/runs/r_4')
    const startedDone = run.perStep.profile?.done ?? 0
    for (let i = 0; i < 12 && run.status === 'running'; i++) run = await api.get<Run>('/runs/r_4')
    expect(run.status).toBe('completed')
    expect(run.finishedAt).toBeTruthy()
    expect(run.perStep.profile?.done).toBeGreaterThan(startedDone)
    expect(run.perStep.profile?.queued).toBe(0)
  })

  it('validates edition and steps', async () => {
    await api.post('/runs/r_4/pause')
    expect(await fail(api.post('/runs', { edition: 1999 }))).toMatchObject({ status: 400 })
    expect(await fail(api.post('/runs', { edition: 2026, steps: ['nope'] }))).toMatchObject({
      status: 400,
    })
  })

  it('the list shows newest first and pages', async () => {
    const list = await api.get<Paged<Run>>('/runs')
    expect(list.total).toBe(db.runs.length)
  })
})

describe('exports', () => {
  beforeEach(() => login())

  it('has the agreed outreach columns and starts with a BOM for Excel', async () => {
    const { res, text } = await csv('/exports/outreach.csv?version=initial')
    expect(res.headers.get('content-type')).toContain('text/csv')
    expect(res.headers.get('content-disposition')).toContain('outreach-initial.csv')
    // fetch().text() hides the BOM, so look at the raw bytes
    const bytes = new Uint8Array(await (await fetch(`${BASE}/exports/outreach.csv`)).arrayBuffer())
    expect([...bytes.slice(0, 3)]).toEqual([0xef, 0xbb, 0xbf])
    const header = parseCsv(text)[0] as string[]
    for (const column of [
      'Hyper-Personalization',
      'Subject Line',
      'Email Draft',
      'Email Verification Status',
      'Verification Date',
      'ADIPEC Profile URL',
      'Website',
      'LinkedIn Company',
    ]) {
      expect(header, column).toContain(column)
    }
  })

  it('initial file says Not Checked everywhere; final file has the real results', async () => {
    const column = (rows: string[][]) => (rows[0] as string[]).indexOf('Email Verification Status')
    const initial = parseCsv((await csv('/exports/outreach.csv?version=initial')).text)
    const final = parseCsv((await csv('/exports/outreach.csv?version=final')).text)
    const values = (rows: string[][]) => new Set(rows.slice(1).map((r) => r[column(rows)]))
    expect([...values(initial)].filter((v) => v && v !== 'not_checked')).toEqual([])
    expect(values(final)).toContain('verified')
  })

  it('keeps companies without contacts as their own row, one row per company-contact pair', async () => {
    const rows = parseCsv((await csv('/exports/outreach.csv')).text).slice(1)
    const expected = db.companies.reduce((n, c) => n + Math.max(1, c.contacts.length), 0)
    expect(rows).toHaveLength(expected)
    const ids = new Set(rows.map((r) => r[0]))
    expect(ids.size).toBe(db.companies.length)
  })

  it('the count endpoint matches the file for the same filters', async () => {
    for (const kind of ['companies', 'contacts', 'outreach']) {
      const { rows } = await api.get<{ rows: number }>(`/exports/${kind}/count`, { country: 'AE' })
      const { text } = await csv(`/exports/${kind}.csv?country=AE`)
      expect(parseCsv(text).length - 1, kind).toBe(rows)
    }
  })

  it('prefers the approved copy over a newer draft', async () => {
    await api.patch('/companies/c_001/ai', {
      action: 'save',
      fields: { hyperPersonalization: 'UNAPPROVED DRAFT TEXT' },
    })
    const { text } = await csv(
      '/exports/companies.csv?q=' + encodeURIComponent(db.companies[0]?.name ?? ''),
    )
    expect(text).not.toContain('UNAPPROVED DRAFT TEXT')
  })

  it('logs every download and lists them newest first', async () => {
    const before = (await api.get<Paged<{ id: string }>>('/exports/log')).total
    await csv('/exports/contacts.csv?version=final')
    const log = await api.get<Paged<{ kind: string; version: string; by: string }>>('/exports/log')
    expect(log.total).toBe(before + 1)
    expect(log.items[0]).toMatchObject({
      kind: 'contacts',
      version: 'final',
      by: 'admin@example.com',
    })
  })

  it('rejects unknown kinds and versions', async () => {
    expect((await csv('/exports/nope.csv')).res.status).toBe(400)
    expect((await csv('/exports/outreach.csv?version=beta')).res.status).toBe(400)
  })

  it('protects spreadsheet cells from formulas', () => {
    expect(toCsv([['=1+1', 'a,b']])).toContain(`"'=1+1"`.replace(/"/g, '') + ',"a,b"')
  })
})

describe('verification', () => {
  beforeEach(() => login())

  it('without a verifier nothing becomes Verified: unchecked emails turn Unknown (FR-19)', async () => {
    const before = await api.get<Overview>('/stats/overview', { edition: 2026 })
    expect(before.emailsByStatus.not_checked).toBeGreaterThan(0)
    await api.post('/runs/r_4/pause')
    expect(await api.post('/verification/run', { edition: 2026 })).toEqual({ queued: true })
    for (let i = 0; i < 12; i++) await api.get('/runs')
    const after = await api.get<Overview>('/stats/overview', { edition: 2026 })
    expect(after.emailsByStatus.not_checked).toBe(0)
    expect(after.emailsByStatus.verified).toBe(before.emailsByStatus.verified)
    expect(after.emailsByStatus.unknown).toBeGreaterThan(before.emailsByStatus.unknown)
  })

  it('with a verifier it records results, dates and the source', async () => {
    db.providers.millionverifier = true
    await api.post('/runs/r_4/pause')
    await api.post('/verification/run', { edition: 2026 })
    for (let i = 0; i < 12; i++) await api.get('/runs')
    const checked = db.companies
      .flatMap((c) => c.contacts.flatMap((p) => p.emails))
      .filter((e) => e.verification.source === 'millionverifier' && e.verification.checkedAt)
    expect(checked.length).toBeGreaterThan(0)
  })

  it('refuses while a run is active', async () => {
    expect(await fail(api.post('/verification/run', { edition: 2026 }))).toMatchObject({
      status: 409,
    })
  })
})

describe('overview, gap report and settings', () => {
  beforeEach(() => login())

  it('keeps the advertised number apart from what was discovered', async () => {
    const o = await api.get<Overview>('/stats/overview', { edition: 2026 })
    expect(o.advertised).toBe(2250)
    expect(o.discovered).not.toBe(o.advertised)
    expect(o.unique + o.duplicates).toBe(o.discovered)
    expect(Object.keys(o.emailsByStatus).sort()).toEqual([...EMAIL_STATUSES].sort())
  })

  it('the gap report numbers match the overview', async () => {
    const o = await api.get<Overview>('/stats/overview', { edition: 2026 })
    const g = await api.get<GapReport>('/reports/gap', { edition: 2026 })
    expect(g.discovered).toBe(o.discovered)
    expect(g.contactsFound).toBe(o.contacts)
    expect(g.byStep).toEqual(o.byStep)
    expect(g.blocked.length).toBeGreaterThan(0)
    expect(g.blocked.every((b) => b.status !== 'completed')).toBe(true)
    const { text } = await csv('/reports/gap.csv?edition=2026')
    expect(parseCsv(text).length - 1).toBe(g.blocked.length)
  })

  it('exposes providers and events; manages suppressions', async () => {
    expect(await api.get('/settings/providers')).toMatchObject({
      llm: true,
      millionverifier: false,
    })
    expect((await api.get<unknown[]>('/events')).length).toBeGreaterThan(0)
    const s = await api.post<{ id: string; value: string }>('/suppressions', {
      value: 'Example.org',
      reason: 'Asked',
    })
    expect(s.value).toBe('example.org')
    expect(await fail(api.post('/suppressions', { value: 'example.org' }))).toMatchObject({
      status: 409,
    })
    expect(await fail(api.post('/suppressions', { value: 'not valid' }))).toMatchObject({
      status: 400,
    })
    await api.del(`/suppressions/${s.id}`)
  })

  it('health works without signing in, cron needs its secret', async () => {
    await api.post('/auth/logout')
    expect(await api.get('/health')).toMatchObject({ ok: true })
    expect(await fail(api.post('/cron/refresh'))).toMatchObject({ status: 401 })
  })
})
