import type { GapReport, Providers, Suppression } from '@/api/types'
import { toCsv } from '../csv'
import { db, nextId } from '../db'
import {
  conflict,
  DOMAIN_RE,
  EMAIL_RE,
  badRequest,
  HttpError,
  json,
  noContent,
  notFound,
  requireString,
  route,
} from '../http'
import { buildGapReport, resolveEdition } from '../stats'

export const systemHandlers = [
  route.get('/health', 'none', () => json({ ok: true, mongo: true, redis: true, workers: true })),

  route.post('/cron/:task', 'none', ({ request }) => {
    if (request.headers.get('x-cron-secret') !== 'mock-secret') {
      throw new HttpError(401, 'unauthorized', 'Missing or wrong cron secret.')
    }
    return json({ queued: true }, 202)
  }),

  route.get('/reports/gap', 'user', ({ url }) =>
    json<GapReport>(buildGapReport(resolveEdition(url.searchParams.get('edition')))),
  ),

  route.get('/reports/gap.csv', 'user', ({ url }) => {
    const report = buildGapReport(resolveEdition(url.searchParams.get('edition')))
    const rows = [
      ['Company ID', 'Company', 'Step', 'Status', 'Reason'],
      ...report.blocked.map((b) => [b.companyId, b.companyName, b.step, b.status, b.reason]),
    ]
    return new Response(toCsv(rows), {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="gap-report-${report.edition}.csv"`,
      },
    })
  }),

  route.get('/settings/providers', 'user', () => json<Providers>(db.providers)),

  route.get('/suppressions', 'admin', () => json<Suppression[]>(db.suppressions)),

  route.post('/suppressions', 'admin', async ({ body }) => {
    const input = await body<{ value?: unknown; reason?: unknown }>()
    const value = requireString(input.value, 'value').toLowerCase()
    if (!EMAIL_RE.test(value) && !DOMAIN_RE.test(value)) {
      throw badRequest('Enter an email address or a domain, for example example.com.')
    }
    if (db.suppressions.some((s) => s.value === value))
      throw conflict('This value is already suppressed.')
    const item: Suppression = {
      id: nextId('s'),
      value,
      reason:
        typeof input.reason === 'string' && input.reason.trim() ? input.reason.trim() : undefined,
      at: new Date().toISOString(),
    }
    db.suppressions.unshift(item)
    return json<Suppression>(item, 201)
  }),

  route.delete('/suppressions/:id', 'admin', ({ params }) => {
    const index = db.suppressions.findIndex((s) => s.id === params.id)
    if (index < 0) throw notFound('Suppression')
    db.suppressions.splice(index, 1)
    return noContent()
  }),
]

/** True when an email address or its domain is on the opt-out list. */
export function isSuppressed(address: string) {
  const lower = address.toLowerCase()
  const domain = lower.split('@')[1]
  return db.suppressions.some((s) => s.value === lower || s.value === domain)
}
