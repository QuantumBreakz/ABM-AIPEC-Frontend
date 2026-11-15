import { screen, within } from '@testing-library/react'
import { fullName } from '@/lib/contacts'
import { db } from '@/mocks/db'
import { reviewItems } from '@/mocks/handlers/review'
import { setupMockApi, signIn } from '@/test/mockApi'
import { renderApp } from '@/test/renderApp'

setupMockApi()
beforeEach(() => signIn())

const company = (id: string) => db.companies.find((c) => c.id === id)

async function open(id: string) {
  renderApp(`/companies/${id}/ai`)
  await screen.findByRole('heading', { level: 1, name: company(id)?.name }, { timeout: 4000 })
}

describe('AI tab on the company page', () => {
  it('shows the draft read-only with its status, and links to the review page', async () => {
    const c = company('c_001')
    await open('c_001')
    const card = await screen.findByRole('region', { name: 'Company draft' })
    expect(within(card).getByText('Approved')).toBeInTheDocument()
    expect(card).toHaveTextContent(c?.ai.summary as string)
    expect(within(card).queryByRole('button', { name: 'Edit' })).not.toBeInTheDocument()
    expect(within(card).getByRole('link', { name: /Open AI review/ })).toHaveAttribute(
      'href',
      '/ai/c_001',
    )
    expect(card).toHaveTextContent(/Approved .* by /)
  })

  it('lists every contact with the status of their message', async () => {
    const c = company('c_001')
    await open('c_001')
    const card = await screen.findByRole('region', {
      name: `Contact messages (${c?.contacts.length})`,
    })
    for (const contact of c?.contacts ?? []) {
      expect(card).toHaveTextContent(fullName(contact))
    }
    expect(card).toHaveTextContent(/never sends anything/)
  })

  it('says why there is no draft instead of showing blanks', async () => {
    await open('c_002') // not enough evidence
    const card = await screen.findByRole('region', { name: 'Company draft' })
    expect(card).toHaveTextContent('Not enough evidence for a draft')
    expect(card).toHaveTextContent(company('c_002')?.ai.reason as string)
    expect(screen.getByRole('region', { name: /Contact messages \(0\)/ })).toHaveTextContent(
      'No contacts yet',
    )
  })
})

describe('AI review queue', () => {
  it('only lists drafts that need attention', () => {
    const items = reviewItems('ai')
    expect(items.length).toBeGreaterThan(0)
    for (const item of items) {
      const c = company(item.companyId)
      const ai = item.contactId ? c?.contacts.find((p) => p.id === item.contactId)?.ai : c?.ai
      expect(['insufficient_evidence', 'rejected']).toContain(ai?.status)
    }
  })
})
