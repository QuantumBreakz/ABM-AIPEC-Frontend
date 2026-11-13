import type { Confidence, Contact, ContactInput, Email } from '@/api/types'
import { safeHttpUrl } from '@/lib/format'
import { parseCsv } from '../csv'
import { addHistory, findContact, nextId } from '../db'
import { refresh } from '../derive'
import { badRequest, EMAIL_RE, json, noContent, notFound, requireString, route } from '../http'
import { isSuppressed } from './system'
import { getCompany } from './companies'

const CONFIDENCE: Confidence[] = ['high', 'medium', 'low']

function optionalText(value: unknown, name: string) {
  if (value === undefined || value === null || value === '') return undefined
  if (typeof value !== 'string') throw badRequest(`"${name}" must be text.`)
  return value.trim()
}

function validateEmails(
  raw: unknown,
): { address: string; type?: 'business' | 'generic'; provider?: string }[] {
  if (raw === undefined) return []
  if (!Array.isArray(raw)) throw badRequest('"emails" must be a list.')
  return raw.map((item, i) => {
    const entry = item as { address?: unknown; type?: unknown; provider?: unknown }
    const address = requireString(entry.address, `emails[${i}].address`).toLowerCase()
    if (!EMAIL_RE.test(address)) throw badRequest(`"${address}" is not a valid email address.`)
    if (isSuppressed(address))
      throw badRequest(`${address} is on the opt-out list and cannot be saved.`)
    if (entry.type !== undefined && entry.type !== 'business' && entry.type !== 'generic') {
      throw badRequest('Email type must be "business" or "generic".')
    }
    return {
      address,
      type: entry.type as 'business' | 'generic' | undefined,
      provider: optionalText(entry.provider, 'provider'),
    }
  })
}

function validateInput(input: Partial<ContactInput>, partial: boolean) {
  const out: Partial<ContactInput> = {}
  const text = (key: 'firstName' | 'lastName' | 'source') => {
    if (input[key] === undefined && partial) return
    out[key] = requireString(input[key], key)
  }
  text('firstName')
  text('lastName')
  text('source')
  for (const key of ['title', 'seniority', 'geography'] as const) {
    if (input[key] !== undefined) out[key] = optionalText(input[key], key)
  }
  if (input.profileUrl !== undefined) {
    const value = optionalText(input.profileUrl, 'profileUrl')
    if (value && !safeHttpUrl(value))
      throw badRequest('"profileUrl" must start with http:// or https://.')
    out.profileUrl = value
  }
  if (input.matchConfidence !== undefined) {
    if (!CONFIDENCE.includes(input.matchConfidence))
      throw badRequest('"matchConfidence" must be high, medium or low.')
    out.matchConfidence = input.matchConfidence
  }
  if (input.emails !== undefined) out.emails = validateEmails(input.emails)
  return out
}

function newEmail(e: { address: string; type?: 'business' | 'generic'; provider?: string }): Email {
  return {
    address: e.address,
    type: e.type ?? 'business',
    provider: e.provider,
    capturedAt: new Date().toISOString(),
    verification: { status: 'not_checked' },
  }
}

/** Add emails that are not on the contact yet. Keeps the existing check results. */
function mergeEmails(contact: Contact, incoming: ReturnType<typeof validateEmails>) {
  for (const e of incoming) {
    if (!contact.emails.some((x) => x.address === e.address)) contact.emails.push(newEmail(e))
  }
}

const emptyAi = () => ({
  status: 'pending' as const,
  reason: 'Draft has not been generated yet.',
  evidenceUrls: [],
  versions: [],
})

/** Create a contact, or update the one with the same name so re-saving never duplicates (AT-05). */
function upsertContact(companyId: string, input: Partial<ContactInput>, by: string) {
  const company = getCompany(companyId)
  const data = validateInput(input, false) as ContactInput
  const existing = company.contacts.find(
    (c) =>
      c.firstName.toLowerCase() === data.firstName.toLowerCase() &&
      c.lastName.toLowerCase() === data.lastName.toLowerCase(),
  )
  const now = new Date().toISOString()
  if (existing) {
    const { emails, ...rest } = data
    Object.assign(existing, rest, { updatedAt: now })
    mergeEmails(existing, emails ?? [])
    refresh(company, true)
    addHistory(
      company.id,
      `contact:${existing.id}`,
      'updated',
      `${existing.firstName} ${existing.lastName}`,
      by,
    )
    return { contact: existing, created: false }
  }
  const { emails, ...rest } = data
  const contact: Contact = {
    ...rest,
    id: nextId('p'),
    companyId,
    emails: [],
    ai: emptyAi(),
    createdAt: now,
    updatedAt: now,
  }
  mergeEmails(contact, emails ?? [])
  company.contacts.push(contact)
  refresh(company, true)
  addHistory(
    company.id,
    `contact:${contact.id}`,
    undefined,
    `${contact.firstName} ${contact.lastName}`,
    by,
  )
  return { contact, created: true }
}

const CSV_COLUMNS = [
  'first_name',
  'last_name',
  'title',
  'seniority',
  'profile_url',
  'geography',
  'email',
]

export const contactHandlers = [
  route.post('/companies/:id/contacts', 'user', async ({ params, body, user }) => {
    const { contact, created } = upsertContact(
      params.id as string,
      await body<Partial<ContactInput>>(),
      user.email,
    )
    return json<Contact>(contact, created ? 201 : 200)
  }),

  route.post('/companies/:id/contacts/import', 'user', async ({ params, body, user }) => {
    getCompany(params.id)
    const input = await body<{ csv?: unknown }>()
    const csv = requireString(input.csv, 'csv')
    const rows = parseCsv(csv)
    const header = (rows[0] ?? []).map((h) => h.trim().toLowerCase())
    const missing = ['first_name', 'last_name'].filter((c) => !header.includes(c))
    if (missing.length > 0)
      throw badRequest(`The first row must contain these columns: ${missing.join(', ')}.`)
    const unknown = header.filter((h) => !CSV_COLUMNS.includes(h))
    if (unknown.length > 0) throw badRequest(`Unknown columns: ${unknown.join(', ')}.`)

    let created = 0
    let updated = 0
    const errors: { row: number; message: string }[] = []
    rows.slice(1).forEach((cells, index) => {
      const row = index + 2 // spreadsheet row number: the header is row 1
      const get = (name: string) => cells[header.indexOf(name)]?.trim() || undefined
      try {
        const email = get('email')
        const result = upsertContact(
          params.id as string,
          {
            firstName: get('first_name') ?? '',
            lastName: get('last_name') ?? '',
            title: get('title'),
            seniority: get('seniority'),
            profileUrl: get('profile_url'),
            geography: get('geography'),
            source: 'csv_import',
            emails: email ? [{ address: email, provider: 'csv_import' }] : undefined,
          },
          user.email,
        )
        if (result.created) created += 1
        else updated += 1
      } catch (error) {
        errors.push({ row, message: error instanceof Error ? error.message : 'Invalid row.' })
      }
    })
    return json({ created, updated, errors })
  }),

  route.patch('/contacts/:id', 'user', async ({ params, body }) => {
    const found = findContact(params.id as string)
    if (!found) throw notFound('Contact')
    const data = validateInput(await body<Partial<ContactInput>>(), true)
    const { emails, ...rest } = data
    Object.assign(found.contact, rest, { updatedAt: new Date().toISOString() })
    if (emails) {
      // Replace the list, but keep the check result of addresses that stay.
      // The type and source can be corrected; the check result is never touched.
      found.contact.emails = emails.map((e) => {
        const same = found.contact.emails.find((x) => x.address === e.address)
        if (!same) return newEmail(e)
        if (e.type) same.type = e.type
        if (e.provider) same.provider = e.provider
        return same
      })
    }
    refresh(found.company, true)
    return json<Contact>(found.contact)
  }),

  route.delete('/contacts/:id', 'admin', ({ params, user }) => {
    const found = findContact(params.id as string)
    if (!found) throw notFound('Contact')
    found.company.contacts.splice(found.company.contacts.indexOf(found.contact), 1)
    addHistory(
      found.company.id,
      `contact:${found.contact.id}`,
      `${found.contact.firstName} ${found.contact.lastName}`,
      undefined,
      user.email,
    )
    refresh(found.company, true)
    return noContent()
  }),
]
