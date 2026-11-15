import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { db } from '@/mocks/db'
import { reviewItems } from '@/mocks/handlers/review'
import { setupMockApi, signIn } from '@/test/mockApi'
import { renderApp } from '@/test/renderApp'

setupMockApi()
beforeEach(() => signIn())

const company = (id: string) => db.companies.find((c) => c.id === id)

async function openDrawer() {
  const target = reviewItems('salesnav')[0]
  expect(target).toBeDefined()
  renderApp(`/review/salesnav?item=${target?.companyId}`)
  const dialog = await screen.findByRole('dialog', {}, { timeout: 4000 })
  await within(dialog).findByRole('button', { name: 'Mark account and people done' })
  return { dialog, id: target?.companyId as string, user: userEvent.setup() }
}

describe('Sales Navigator review', () => {
  it('links out to the search in a new tab and never claims to automate it', async () => {
    const { dialog, id } = await openDrawer()
    const link = within(dialog).getByRole('link', { name: /Open Sales Navigator search/ })
    expect(link).toHaveAttribute('href', company(id)?.salesNav.searchUrl)
    expect(link).toHaveAttribute('target', '_blank')
    expect(link).toHaveAttribute('rel', expect.stringContaining('noopener'))
    expect(dialog).toHaveTextContent(company(id)?.name as string)
    expect(dialog).toHaveTextContent(/by hand/)
  })

  it('shows the coverage warning and does not suggest the list is complete', async () => {
    const { dialog } = await openDrawer()
    expect(within(dialog).getByText('Coverage unconfirmed')).toBeInTheDocument()
    expect(dialog).toHaveTextContent(/Relationship Explorer/)
    expect(dialog).not.toHaveTextContent(/complete list/i)
  })

  it('adds a decision-maker without leaving the drawer', async () => {
    const { dialog, id, user } = await openDrawer()
    const before = company(id)?.contacts.length as number
    await user.click(within(dialog).getByRole('button', { name: 'Add contact' }))
    const form = await screen.findByRole('dialog', { name: 'Add a contact' })
    await user.type(within(form).getByLabelText(/First name/), 'Ines')
    await user.type(within(form).getByLabelText(/Last name/), 'Marlow')
    await user.click(within(form).getByRole('button', { name: 'Add contact' }))
    await waitFor(() => expect(company(id)?.contacts).toHaveLength(before + 1))
    expect(await screen.findByRole('list', { name: 'Saved decision-makers' })).toHaveTextContent(
      'Ines Marlow',
    )
  })

  it('marks account and people done, removes the item and logs it in the history', async () => {
    const { dialog, id, user } = await openDrawer()
    const before = reviewItems('salesnav').length
    await user.click(within(dialog).getByRole('button', { name: 'Mark account and people done' }))
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    expect(company(id)?.stages.account.status).toBe('completed')
    expect(company(id)?.stages.people.status).toBe('completed')
    expect(reviewItems('salesnav')).toHaveLength(before - 1)
    expect(db.history[id]?.some((h) => h.field === 'stages.account')).toBe(true)
  })
})
