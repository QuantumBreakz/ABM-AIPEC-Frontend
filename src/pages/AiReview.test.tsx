import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { fullName } from '@/lib/contacts'
import { db } from '@/mocks/db'
import { setupMockApi, signIn } from '@/test/mockApi'
import { renderApp } from '@/test/renderApp'

setupMockApi()
beforeEach(() => signIn())

const company = (id: string) => db.companies.find((c) => c.id === id)

async function open(id: string) {
  const app = renderApp(`/ai/${id}`)
  await screen.findByRole(
    'heading',
    { level: 1, name: `AI review · ${company(id)?.name}` },
    { timeout: 4000 },
  )
  return { ...app, user: userEvent.setup() }
}

const block = (name: string) => screen.getByRole('region', { name })

describe('AI review page', () => {
  it('shows the evidence with sources next to a draft for the company and one per contact', async () => {
    const c = company('c_001')
    await open('c_001')
    const facts = c?.website.facts ?? []
    expect(facts.length).toBeGreaterThan(0)
    expect(screen.getByRole('heading', { name: 'Facts with sources' })).toBeInTheDocument()
    expect(screen.getAllByRole('link', { name: /Source|\./ }).length).toBeGreaterThan(0)
    expect(block('Company')).toBeInTheDocument()
    for (const contact of c?.contacts ?? []) {
      expect(block(fullName(contact))).toBeInTheDocument()
    }
  })

  it('shows a clickable source for the signal (AT-08)', async () => {
    const c = company('c_001')
    await open('c_001')
    const link = within(block('Company'))
      .getAllByRole('link')
      .find((a) => a.getAttribute('href') === c?.ai.signalUrl)
    expect(c?.ai.signalUrl).toBeTruthy()
    expect(link).toBeDefined()
    expect(link).toHaveAttribute('target', '_blank')
  })

  it('warns when there is not enough evidence and does not allow approving', async () => {
    await open('c_002')
    const company_ = block('Company')
    expect(within(company_).getByRole('alert')).toHaveTextContent(/not enough sourced information/)
    expect(within(company_).getByRole('button', { name: 'Approve' })).toBeDisabled()
    expect(company_).toHaveTextContent(/Approve is off/)
  })

  it('saves an edit as a new version without approving it', async () => {
    const { user } = await open('c_004')
    const before = company('c_004')?.ai.versions.length as number
    const b = block('Company')
    await user.click(within(b).getByRole('button', { name: 'Edit' }))
    const summary = within(b).getByLabelText('Company summary')
    await user.clear(summary)
    await user.type(summary, 'A short edited summary. It has two sentences.')
    await user.click(within(b).getByRole('button', { name: 'Save' }))
    await waitFor(() => expect(company('c_004')?.ai.versions).toHaveLength(before + 1))
    expect(company('c_004')?.ai.summary).toBe('A short edited summary. It has two sentences.')
    expect(company('c_004')?.ai.status).toBe('draft')
    expect(company('c_004')?.ai.approved).toBeUndefined()
  })

  it('shows a soft sentence guide that never blocks saving', async () => {
    const { user } = await open('c_004')
    const b = block('Company')
    await user.click(within(b).getByRole('button', { name: 'Edit' }))
    const summary = within(b).getByLabelText('Company summary')
    await user.clear(summary)
    await user.type(summary, 'Only one sentence.')
    expect(within(b).getByText(/1 sentence \(suggested 2–5\)/)).toBeInTheDocument()
    expect(within(b).getByRole('button', { name: 'Save' })).toBeEnabled()
  })

  it('approves a draft and shows the approved copy with its date', async () => {
    const { user } = await open('c_004')
    const b = block('Company')
    await user.click(within(b).getByRole('button', { name: 'Approve' }))
    await waitFor(() => expect(company('c_004')?.ai.status).toBe('approved'))
    const approved = await within(b).findByRole('region', { name: 'Approved copy, Company' })
    expect(approved).toHaveTextContent(/approved/i)
    expect(company('c_004')?.ai.approved?.fields.summary).toBe(company('c_004')?.ai.summary)
  })

  it('requires a reason to reject, then records it', async () => {
    const { user } = await open('c_004')
    const b = block('Company')
    await user.click(within(b).getByRole('button', { name: 'Reject' }))
    const dialog = await screen.findByRole('dialog', { name: 'Reject this draft?' })
    await user.click(within(dialog).getByRole('button', { name: 'Reject' }))
    expect(await within(dialog).findByRole('alert')).toHaveTextContent(/short reason/)
    expect(company('c_004')?.ai.status).not.toBe('rejected')
    await user.type(within(dialog).getByLabelText('Reason'), 'Too generic')
    await user.click(within(dialog).getByRole('button', { name: 'Reject' }))
    await waitFor(() => expect(company('c_004')?.ai.status).toBe('rejected'))
    expect(company('c_004')?.ai.reason).toBe('Too generic')
  })

  it('keeps the approved copy unchanged when a new draft is generated (FR-30)', async () => {
    const { user } = await open('c_001')
    const approvedBefore = structuredClone(company('c_001')?.ai.approved)
    const versionsBefore = company('c_001')?.ai.versions.length as number
    expect(approvedBefore).toBeDefined()
    await user.click(within(block('Company')).getByRole('button', { name: 'Regenerate' }))
    await waitFor(
      () => expect(company('c_001')?.ai.versions.length).toBeGreaterThan(versionsBefore),
      { timeout: 6000 },
    )
    expect(company('c_001')?.ai.approved).toEqual(approvedBefore)
    const approvedBlock = await screen.findByRole('region', { name: 'Approved copy, Company' })
    expect(approvedBlock).toHaveTextContent(approvedBefore?.fields.summary as string)
    expect(approvedBlock).toHaveTextContent(/Exports use this approved copy/)
  })

  it('lets you look at an older version and use it as the new draft', async () => {
    const { user } = await open('c_001')
    const b = block('Company')
    const count = company('c_001')?.ai.versions.length as number
    expect(count).toBeGreaterThan(1)
    await user.selectOptions(within(b).getByLabelText('Version'), '1')
    expect(within(b).getByText('You are looking at an older version.')).toBeInTheDocument()
    expect(within(b).getByRole('button', { name: 'Approve' })).toBeDisabled()
    await user.click(within(b).getByRole('button', { name: 'Use this version as the new draft' }))
    await waitFor(() => expect(company('c_001')?.ai.versions).toHaveLength(count + 1))
  })

  it('has copy buttons and says drafts are never sent by the app', async () => {
    await open('c_001')
    const first = company('c_001')?.contacts[0]
    const b = block(fullName(first as NonNullable<typeof first>))
    expect(b).toHaveTextContent(/never sends email or LinkedIn/)
    expect(within(b).getByRole('button', { name: 'Copy Email draft' })).toBeInTheDocument()
    expect(within(b).getByRole('button', { name: 'Copy LinkedIn message' })).toBeInTheDocument()
  })

  it('is reachable from the AI tab of the company', async () => {
    renderApp('/companies/c_001/ai')
    const link = await screen.findByRole('link', { name: 'Open AI review' }, { timeout: 4000 })
    expect(link).toHaveAttribute('href', '/ai/c_001')
  })
})
