import type { Company, CompanyFilters, ExportKind, ExportLogEntry, Paged } from '@/api/types'
import { toCsv } from '../csv'
import { db, nextId } from '../db'
import { badRequest, json, paginate, route } from '../http'
import { assertNoActiveRun, createRun } from './runs'
import { filterCompanies } from './companies'

const KINDS: ExportKind[] = ['companies', 'contacts', 'outreach']

function kindOf(raw: string | undefined): ExportKind {
  if (!KINDS.includes(raw as ExportKind))
    throw badRequest(`Export type must be one of: ${KINDS.join(', ')}.`)
  return raw as ExportKind
}

/** Same filters as the company list; `version` and `page` are not filters. */
function filtersFrom(url: URL): CompanyFilters {
  const f: Record<string, unknown> = {}
  for (const [k, v] of url.searchParams)
    if (k !== 'version' && k !== 'page' && k !== 'pageSize') f[k] = v
  return f as CompanyFilters
}

/** The approved copy wins over the latest draft (exports prefer approved). */
const approvedOr = (company: Company, key: string): string => {
  const approved = company.ai.approved?.fields[key]
  if (approved !== undefined) return approved
  const live = (company.ai as unknown as Record<string, unknown>)[key]
  return typeof live === 'string' ? live : ''
}

const companyColumns = [
  'Company ID',
  'Company',
  'Original Names',
  'Editions',
  'ADIPEC Profile URL',
  'Stand',
  'Category',
  'Country',
  'ADIPEC Description',
  'Domain',
  'Website',
  'Company Summary',
  'Services',
  'Markets',
  'LinkedIn',
  'Facebook',
  'Instagram',
  'X',
  'YouTube',
  'Other Social Links',
  'Profile Status',
  'Website Status',
  'Social Status',
  'Account Status',
  'People Status',
  'Emails Status',
  'Verification Status',
  'Personalization Status',
  'Duplicate Of',
  'Completeness',
  'Hyper-Personalization',
  'Evidence URLs',
  'Last Updated',
]

function companyRow(c: Company) {
  const e = c.editions[0]
  return [
    c.id,
    c.name,
    c.originalNames.join(' | '),
    c.editions.map((x) => x.edition).join(' | '),
    e?.profileUrl,
    c.stand,
    c.category,
    c.country,
    e?.description,
    c.domain,
    c.website.url,
    c.website.summary,
    c.website.services.join(' | '),
    c.website.markets.join(' | '),
    c.socials.linkedin,
    c.socials.facebook,
    c.socials.instagram,
    c.socials.x,
    c.socials.youtube,
    c.socials.other.join(' | '),
    c.stages.profile.status,
    c.stages.website.status,
    c.stages.social.status,
    c.stages.account.status,
    c.stages.people.status,
    c.stages.emails.status,
    c.stages.verification.status,
    c.stages.personalization.status,
    c.duplicateOf,
    c.completeness,
    approvedOr(c, 'hyperPersonalization'),
    c.ai.evidenceUrls.join(' | '),
    c.updatedAt,
  ]
}

const contactColumns = [
  'Contact ID',
  'Company ID',
  'Company',
  'First Name',
  'Last Name',
  'Title',
  'Seniority',
  'Profile URL',
  'Geography',
  'Match Confidence',
  'Source',
  'Email',
  'Email Type',
  'Email Provider',
  'Email Captured',
  'Verification Status',
  'Verification Date',
  'Verification Source',
]

const outreachColumns = [
  'Company ID',
  'Company',
  'Domain',
  'Website',
  'ADIPEC Profile URL',
  'LinkedIn Company',
  'Contact ID',
  'First Name',
  'Last Name',
  'Title',
  'Profile URL',
  'Email',
  'Email Verification Status',
  'Verification Date',
  'Contact Source',
  'Hyper-Personalization',
  'Subject Line',
  'Email Draft',
  'LinkedIn Draft',
  'Evidence URLs',
  'AI Status',
]

type Version = 'initial' | 'final'

/** Before the bulk check (initial) every email reads Not Checked; the final file has the real results. */
function status(version: Version, real: string) {
  return version === 'initial' ? 'not_checked' : real
}

function buildRows(kind: ExportKind, companies: Company[], version: Version) {
  if (kind === 'companies') return [companyColumns, ...companies.map(companyRow)]

  if (kind === 'contacts') {
    const rows: (string | number | undefined)[][] = [contactColumns]
    for (const c of companies) {
      for (const p of c.contacts) {
        const emails = p.emails.length > 0 ? p.emails : [undefined]
        for (const e of emails) {
          rows.push([
            p.id,
            c.id,
            c.name,
            p.firstName,
            p.lastName,
            p.title,
            p.seniority,
            p.profileUrl,
            p.geography,
            p.matchConfidence,
            p.source,
            e?.address,
            e?.type,
            e?.provider,
            e?.capturedAt,
            e ? status(version, e.verification.status) : undefined,
            e && version === 'final' ? e.verification.checkedAt : undefined,
            e && version === 'final' ? e.verification.source : undefined,
          ])
        }
      }
    }
    return rows
  }

  // outreach: one row per company-contact pair; companies without contacts keep one row
  const rows: (string | number | undefined)[][] = [outreachColumns]
  for (const c of companies) {
    const head = [
      c.id,
      c.name,
      c.domain,
      c.website.url,
      c.editions[0]?.profileUrl,
      c.socials.linkedin,
    ]
    if (c.contacts.length === 0) {
      rows.push([
        ...head,
        ...Array(9).fill(undefined),
        approvedOr(c, 'hyperPersonalization'),
        undefined,
        undefined,
        undefined,
        c.ai.evidenceUrls.join(' | '),
        c.ai.status,
      ])
      continue
    }
    for (const p of c.contacts) {
      const e = p.emails[0]
      const ai = (key: string) =>
        p.ai.approved?.fields[key] ??
        ((p.ai as unknown as Record<string, unknown>)[key] as string | undefined)
      rows.push([
        ...head,
        p.id,
        p.firstName,
        p.lastName,
        p.title,
        p.profileUrl,
        e?.address,
        e ? status(version, e.verification.status) : undefined,
        e && version === 'final' ? e.verification.checkedAt : undefined,
        p.source,
        approvedOr(c, 'hyperPersonalization'),
        ai('subject'),
        ai('draft'),
        ai('linkedinDraft'),
        [...c.ai.evidenceUrls, ...p.ai.evidenceUrls].join(' | '),
        p.ai.status,
      ])
    }
  }
  return rows
}

function rowCount(kind: ExportKind, companies: Company[]) {
  return buildRows(kind, companies, 'final').length - 1
}

export const exportHandlers = [
  // Registered before /exports/:file so "log" is not read as a file name.
  route.get('/exports/log', 'user', ({ url }) =>
    json<Paged<ExportLogEntry>>(paginate(db.exportLog, url)),
  ),

  route.get('/exports/:kind/count', 'user', ({ params, url }) => {
    const kind = kindOf(params.kind)
    return json({ rows: rowCount(kind, filterCompanies(url.searchParams)) })
  }),

  route.get('/exports/:file', 'user', ({ params, url, user }) => {
    const match = /^(.+)\.csv$/.exec(params.file ?? '')
    if (!match) throw badRequest('Download a file like /exports/outreach.csv.')
    const kind = kindOf(match[1])
    const version = (url.searchParams.get('version') ?? 'initial') as Version
    if (version !== 'initial' && version !== 'final')
      throw badRequest('"version" must be initial or final.')

    const companies = filterCompanies(url.searchParams)
    const csv = toCsv(buildRows(kind, companies, version))
    db.exportLog.unshift({
      id: nextId('x'),
      kind,
      version,
      filters: filtersFrom(url),
      rows: rowCount(kind, companies),
      by: user.email,
      at: new Date().toISOString(),
    })
    return new Response(csv, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="${kind}-${version}.csv"`,
      },
    })
  }),

  route.post('/verification/run', 'admin', async ({ body, user }) => {
    const input = await body<{ edition?: unknown }>()
    const edition = Number(input.edition)
    if (!db.events.some((e) => e.edition === edition))
      throw badRequest('Pick an edition that exists.')
    assertNoActiveRun()
    const emails = db.companies
      .filter((c) => c.editions.some((e) => e.edition === edition))
      .flatMap((c) => c.contacts.flatMap((p) => p.emails)).length
    createRun(edition, ['verification'], user.email, emails)
    return json({ queued: true }, 202)
  }),
]
