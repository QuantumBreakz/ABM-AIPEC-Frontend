import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { db } from '@/mocks/db'
import { reviewItems } from '@/mocks/handlers/review'
import { setupMockApi, signIn } from '@/test/mockApi'
import { renderApp } from '@/test/renderApp'

setupMockApi()
beforeEach(() => signIn())

const company = (id: string) => db.companies.find((c) => c.id === id)
const findContact = (id: string | undefined) =>
  db.companies.flatMap((c) => c.contacts).find((c) => c.id === id)

describe('Contacts review', () => {
  async function openContacts() {
    const target = reviewItems('contacts')[0]
    expect(target).toBeDefined()
    renderApp(`/review/contacts?item=${target?.companyId}`)
    const dialog = await screen.findByRole('dialog', {}, { timeout: 4000 })
    await within(dialog).findByRole('button', { name: 'Mark as none found' })
    return { dialog, id: target?.companyId as string, user: userEvent.setup() }
  }

  it('offers to add a contact or look in Sales Navigator', async () => {
    const { dialog, id } = await openContacts()
    expect(within(dialog).getByRole('button', { name: 'Add contact' })).toBeInTheDocument()
    expect(within(dialog).getByRole('link', { name: /Look in Sales Navigator/ })).toHaveAttribute(
      'href',
      `/review/salesnav?item=${id}`,
    )
  })

  it('needs a reason before marking none found', async () => {
    const { dialog, user } = await openContacts()
    await user.click(within(dialog).getByRole('button', { name: 'Mark as none found' }))
    expect(await within(dialog).findByRole('alert')).toHaveTextContent(/short reason/)
  })

  it('records none found with the reason, leaves the queue and shows in the history', async () => {
    const { dialog, id, user } = await openContacts()
    const before = reviewItems('contacts').length
    await user.type(within(dialog).getByLabelText('Reason'), 'Very small firm')
    await user.click(within(dialog).getByRole('button', { name: 'Mark as none found' }))
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    expect(company(id)?.stages.people.status).toBe('completed')
    expect(company(id)?.stages.people.reason).toContain('Very small firm')
    expect(company(id)?.contacts).toHaveLength(0)
    expect(reviewItems('contacts')).toHaveLength(before - 1)
    expect(db.history[id]?.some((h) => h.field === 'stages.people')).toBe(true)
  })

  it('adding a contact takes the company out of the queue', async () => {
    const { dialog, id, user } = await openContacts()
    const before = reviewItems('contacts').length
    await user.click(within(dialog).getByRole('button', { name: 'Add contact' }))
    const form = await screen.findByRole('dialog', { name: 'Add a contact' })
    await user.type(within(form).getByLabelText(/First name/), 'Rae')
    await user.type(within(form).getByLabelText(/Last name/), 'Ortiz')
    await user.click(within(form).getByRole('button', { name: 'Add contact' }))
    await waitFor(() => expect(company(id)?.contacts).toHaveLength(1))
    expect(reviewItems('contacts')).toHaveLength(before - 1)
  })
})

describe('Emails review', () => {
  async function openEmail() {
    const target = reviewItems('emails')[0]
    expect(target).toBeDefined()
    renderApp(`/review/emails?item=${target?.companyId}&contact=${target?.contactId}`)
    const dialog = await screen.findByRole('dialog', {}, { timeout: 4000 })
    const contact = findContact(target?.contactId)
    await within(dialog).findByRole('region', {
      name: `Emails of ${contact?.firstName} ${contact?.lastName}`,
    })
    const address = target?.reason.split(' ')[0] as string
    return { dialog, contact, user: userEvent.setup(), target, address }
  }

  it('shows the flagged email with its status and the reason', async () => {
    const { dialog, target } = await openEmail()
    expect(dialog).toHaveTextContent(target?.reason as string)
    expect(dialog).toHaveTextContent(/Invalid|Risky|Unknown/)
  })

  it('corrects an address: a source is required and the new address is not checked', async () => {
    const { dialog, contact, user, target, address } = await openEmail()
    await user.click(within(dialog).getByRole('button', { name: `Correct ${address}` }))
    const field = within(dialog).getByLabelText('Email address')
    await user.clear(field)
    await user.type(field, 'fixed.address@example.com')
    await user.selectOptions(within(dialog).getByLabelText('Where did you find it?'), '')
    await user.click(within(dialog).getByRole('button', { name: 'Save email' }))
    expect(await within(dialog).findByText('Say where this email came from.')).toBeInTheDocument()
    await user.selectOptions(within(dialog).getByLabelText('Where did you find it?'), 'manual')
    await user.click(within(dialog).getByRole('button', { name: 'Save email' }))
    await waitFor(() => {
      const saved = findContact(contact?.id)?.emails.find(
        (e) => e.address === 'fixed.address@example.com',
      )
      expect(saved?.verification.status).toBe('not_checked')
      expect(saved?.provider).toBe('manual')
    })
    expect(db.history[target?.companyId as string]?.some((h) => h.field.startsWith('email:'))).toBe(
      true,
    )
  })

  it('removes an email after confirmation and logs it', async () => {
    const { dialog, contact, user, target, address } = await openEmail()
    await user.click(within(dialog).getByRole('button', { name: `Remove ${address}` }))
    const confirm = await screen.findByRole('dialog', { name: `Remove ${address}?` })
    await user.click(within(confirm).getByRole('button', { name: 'Remove' }))
    await waitFor(() =>
      expect(findContact(contact?.id)?.emails.some((e) => e.address === address)).toBe(false),
    )
    const entry = db.history[target?.companyId as string]?.find((h) => h.field.startsWith('email:'))
    expect(entry?.before).toBe(address)
  })

  it('adds an email with a source, saved as not checked', async () => {
    const { dialog, contact, user } = await openEmail()
    await user.click(within(dialog).getByRole('button', { name: 'Add email' }))
    await user.type(within(dialog).getByLabelText('Email address'), 'new.person@example.com')
    await user.selectOptions(within(dialog).getByLabelText('Where did you find it?'), 'website')
    await user.click(within(dialog).getByRole('button', { name: 'Add email' }))
    await waitFor(() => {
      const added = findContact(contact?.id)?.emails.find(
        (e) => e.address === 'new.person@example.com',
      )
      expect(added?.provider).toBe('website')
      expect(added?.verification.status).toBe('not_checked')
    })
  })
})
