import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { api } from '@/api/client'
import { polling } from '@/api/queries/runs'
import type { Paged } from '@/api/types'
import { EMAIL_STATUS_META } from '@/lib/status'
import { db } from '@/mocks/db'
import { setupMockApi, signIn } from '@/test/mockApi'
import { renderApp } from '@/test/renderApp'

setupMockApi()
beforeEach(() => {
  polling.runsMs = 40
  return signIn()
})
afterEach(() => {
  polling.runsMs = 5_000
})

const addInitialExport = () =>
  db.exportLog.unshift({
    id: 'x_initial',
    kind: 'contacts',
    version: 'initial',
    filters: {},
    rows: 5,
    by: 'admin@example.com',
    at: new Date().toISOString(),
  })

async function open() {
  const app = renderApp('/exports')
  await screen.findByRole('heading', { level: 1, name: 'Exports' }, { timeout: 4000 })
  return { ...app, user: userEvent.setup() }
}

const card = () => screen.findByRole('region', { name: '4. Check the emails' })
const notChecked = () =>
  db.companies
    .flatMap((c) => c.contacts.flatMap((p) => p.emails))
    .filter((e) => e.verification.status === 'not_checked')

describe('Check emails (admin)', () => {
  it('is hidden from a reviewer', async () => {
    await api.post('/auth/logout')
    await signIn('reviewer@example.com')
    await open()
    expect(screen.queryByRole('region', { name: '4. Check the emails' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Check emails' })).not.toBeInTheDocument()
  })

  it('stays off until an initial export exists, and says why', async () => {
    db.exportLog.length = 0
    await open()
    const section = await card()
    expect(within(section).getByRole('button', { name: 'Check emails' })).toBeDisabled()
    expect(section).toHaveTextContent(/Download an initial export first/)
  })

  it('turns on once an initial export is in the log', async () => {
    addInitialExport()
    await open()
    const section = await card()
    await waitFor(() =>
      expect(within(section).getByRole('button', { name: 'Check emails' })).toBeEnabled(),
    )
    expect(section).toHaveTextContent(/emails? (has|have) not been checked yet/)
  })

  it('without MillionVerifier the dialog says it is an MX-only check that cannot verify', async () => {
    db.providers.millionverifier = false
    addInitialExport()
    const { user } = await open()
    const section = await card()
    const button = within(section).getByRole('button', { name: 'Check emails' })
    await waitFor(() => expect(button).toBeEnabled())
    await user.click(button)
    const dialog = await screen.findByRole('dialog', { name: 'Check the emails?' })
    await waitFor(() => expect(dialog).toHaveTextContent(/MX/))
    expect(dialog).toHaveTextContent(/cannot mark any email as Verified/)
  })

  it('with MillionVerifier the dialog names it', async () => {
    db.providers.millionverifier = true
    addInitialExport()
    const { user } = await open()
    const section = await card()
    const button = within(section).getByRole('button', { name: 'Check emails' })
    await waitFor(() => expect(button).toBeEnabled())
    await user.click(button)
    const dialog = await screen.findByRole('dialog', { name: 'Check the emails?' })
    await waitFor(() => expect(dialog).toHaveTextContent(/MillionVerifier/))
    expect(dialog).not.toHaveTextContent(/cannot mark any email as Verified/)
  })

  it('runs the check, shows progress, and never marks anything Verified without a checker', async () => {
    db.providers.millionverifier = false
    addInitialExport()
    expect(notChecked().length).toBeGreaterThan(0)
    const { user } = await open()
    const section = await card()
    const button = within(section).getByRole('button', { name: 'Check emails' })
    await waitFor(() => expect(button).toBeEnabled())
    await user.click(button)
    const dialog = await screen.findByRole('dialog', { name: 'Check the emails?' })
    await user.click(within(dialog).getByRole('button', { name: 'Start the check' }))

    const latest = await within(section).findByRole('region', { name: 'Latest email check' })
    expect(within(latest).getByRole('progressbar', { name: 'Email check progress' })).toBeVisible()
    expect(within(latest).getByRole('link', { name: 'Open run details' })).toHaveAttribute(
      'href',
      expect.stringMatching(/^\/runs\//),
    )
    await waitFor(() => expect(notChecked()).toHaveLength(0), { timeout: 8000 })
    const statuses = db.companies
      .flatMap((c) => c.contacts.flatMap((p) => p.emails))
      .filter((e) => e.verification.source === 'mx-check')
    expect(statuses.length).toBeGreaterThan(0)
    expect(statuses.every((e) => e.verification.status !== 'verified')).toBe(true)
  })

  it('says there is nothing left to check once the check has finished', async () => {
    addInitialExport()
    const { user } = await open()
    const section = await card()
    const button = within(section).getByRole('button', { name: 'Check emails' })
    await waitFor(() => expect(button).toBeEnabled())
    await user.click(button)
    await user.click(
      within(await screen.findByRole('dialog', { name: 'Check the emails?' })).getByRole('button', {
        name: 'Start the check',
      }),
    )
    await within(section).findByRole('region', { name: 'Latest email check' })
    // After it finishes the button explains there is nothing left to check.
    await waitFor(() => expect(section).toHaveTextContent(/already been checked/), {
      timeout: 8000,
    })
    expect(within(section).getByRole('button', { name: 'Check emails' })).toBeDisabled()
  })
})

describe('Email statuses', () => {
  it('Not checked and Unknown look different from Verified, and each says why', () => {
    const { verified, unknown, not_checked: notChecked } = EMAIL_STATUS_META
    expect(notChecked.label).not.toBe(verified.label)
    expect(unknown.label).not.toBe(verified.label)
    expect(notChecked.tone).not.toBe(verified.tone)
    expect(unknown.tone).not.toBe(verified.tone)
    expect(notChecked.icon).not.toBe(unknown.icon)
    expect(notChecked.description).toMatch(/not a verified address/i)
    expect(unknown.description).toMatch(/could not tell/i)
  })

  it('filters the company list and the export by email status, with matching counts', async () => {
    await open()
    const list = await api.get<Paged<unknown>>('/companies', { emailStatus: 'not_checked' })
    const all = await api.get<Paged<unknown>>('/companies', {})
    const count = await api.get<{ rows: number }>('/exports/companies/count', {
      emailStatus: 'not_checked',
    })
    expect(list.total).toBeGreaterThan(0)
    expect(list.total).toBeLessThan(all.total)
    expect(count.rows).toBe(list.total)
  })

  it('the export page offers the email status filter', async () => {
    const { user } = await open()
    await user.click(await screen.findByRole('button', { name: /Filters|More filters/ }))
    expect(await screen.findByLabelText('Email status')).toBeInTheDocument()
  })
})
