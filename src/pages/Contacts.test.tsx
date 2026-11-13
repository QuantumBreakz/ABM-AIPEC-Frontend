import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { api } from '@/api/client'
import { sourceLabel } from '@/lib/contacts'
import { db } from '@/mocks/db'
import { reviewItems } from '@/mocks/handlers/review'
import { setupMockApi, signIn } from '@/test/mockApi'
import { renderApp } from '@/test/renderApp'

setupMockApi()
beforeEach(() => signIn())

const company = (id: string) => db.companies.find((c) => c.id === id)

async function open(id: string) {
  const app = renderApp(`/companies/${id}/contacts`)
  await screen.findByRole('heading', { level: 1, name: company(id)?.name }, { timeout: 4000 })
  return app
}

const card = () => screen.getByRole('region', { name: /^Decision-makers/ })

async function openAddDialog() {
  const user = userEvent.setup()
  await user.click(within(card()).getAllByRole('button', { name: /Add contact/ })[0] as HTMLElement)
  const dialog = await screen.findByRole('dialog', { name: 'Add a contact' })
  return { user, dialog }
}

describe('Contacts list', () => {
  it('lists every decision-maker with their title, emails, source and status', async () => {
    const c = company('c_001')
    await open('c_001')
    expect(card()).toHaveAccessibleName(`Decision-makers (${c?.contacts.length})`)
    const table = within(card()).getByRole('table', {
      name: 'Decision-makers saved for this company',
    })
    expect(within(table).getAllByRole('row')).toHaveLength((c?.contacts.length as number) + 1)

    for (const contact of c?.contacts ?? []) {
      const name = `${contact.firstName} ${contact.lastName}`
      const row = within(table)
        .getByRole('rowheader', { name: new RegExp(name) })
        .closest('tr') as HTMLElement
      expect(row).toHaveTextContent(contact.title as string)
      const emails = within(row).getByRole('list', { name: `Emails of ${name}` })
      for (const email of contact.emails) {
        const item = within(emails).getByText(email.address).closest('li') as HTMLElement
        expect(item).toHaveTextContent(`Source: ${sourceLabel(email.provider)}`)
        expect(item).toHaveTextContent(/Verified|Risky|Invalid|Unknown|Not checked/)
      }
      expect(within(row).getByRole('link', { name: /linkedin\.com/ })).toBeInTheDocument()
    }
  })

  it('never shows an unchecked email as verified', async () => {
    const c = company('c_006') // contacts whose emails were never checked
    expect(c?.contacts.length).toBeGreaterThan(0)
    await open('c_006')
    for (const contact of c?.contacts ?? []) {
      const list = within(card()).getByRole('list', {
        name: `Emails of ${contact.firstName} ${contact.lastName}`,
      })
      expect(list).toHaveTextContent('Not checked')
      expect(list).not.toHaveTextContent('Verified')
    }
  })

  it('shows missing details as missing, never as a blank', async () => {
    const c = company('c_001')
    const person = c?.contacts[0]
    if (person) {
      person.title = undefined
      person.profileUrl = undefined
      person.emails = []
    }
    await open('c_001')
    const row = within(card())
      .getByRole('rowheader', { name: new RegExp(`${person?.firstName} ${person?.lastName}`) })
      .closest('tr') as HTMLElement
    expect(row).toHaveTextContent('No title recorded')
    expect(row).toHaveTextContent('No emails saved')
    expect(within(row).getByText('Not available')).toBeInTheDocument()
  })

  it('flags an email that has no recorded source', async () => {
    const person = company('c_001')?.contacts[0]
    if (person?.emails[0]) person.emails[0].provider = undefined
    await open('c_001')
    expect(card()).toHaveTextContent('No source recorded')
  })

  it('explains a company with no contacts, and says that is still valid', async () => {
    await open('c_004')
    expect(card()).toHaveAccessibleName('Decision-makers (0)')
    expect(within(card()).getByText('No decision-makers saved yet')).toBeInTheDocument()
    expect(within(card()).getAllByRole('button', { name: /Add contact/ }).length).toBeGreaterThan(0)
  })

  it('puts the leadership coverage above the list', async () => {
    await open('c_001')
    const coverage = screen.getByRole('region', { name: 'Sales Navigator account' })
    expect(coverage.compareDocumentPosition(card()) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
  })
})

describe('Adding a contact', () => {
  async function fillBasics(
    dialog: HTMLElement,
    user: ReturnType<typeof userEvent.setup>,
    first: string,
    last: string,
  ) {
    await user.type(within(dialog).getByLabelText('First name'), first)
    await user.type(within(dialog).getByLabelText('Last name'), last)
  }

  it('adds a person with an email that starts as Not checked', async () => {
    await open('c_004')
    const { user, dialog } = await openAddDialog()
    await fillBasics(dialog, user, 'Nadia', 'Hamdan')
    await user.type(within(dialog).getByLabelText('Job title'), 'Chief Digital Officer')
    await user.selectOptions(within(dialog).getByLabelText('Seniority'), 'CXO')
    await user.click(within(dialog).getByRole('button', { name: 'Add an email' }))
    await user.type(within(dialog).getByLabelText('Email 1'), 'nadia.hamdan@example.com')
    await user.selectOptions(within(dialog).getByLabelText('Source of email 1'), 'contactout')
    await user.click(within(dialog).getByRole('button', { name: 'Add contact' }))

    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    const saved = company('c_004')?.contacts.find((p) => p.lastName === 'Hamdan')
    expect(saved).toMatchObject({
      firstName: 'Nadia',
      title: 'Chief Digital Officer',
      seniority: 'CXO',
      source: 'manual',
    })
    expect(saved?.emails[0]).toMatchObject({
      address: 'nadia.hamdan@example.com',
      provider: 'contactout',
    })
    expect(saved?.emails[0]?.verification.status).toBe('not_checked')

    const list = await screen.findByRole('list', { name: 'Emails of Nadia Hamdan' })
    expect(list).toHaveTextContent('Not checked')
    expect(list).toHaveTextContent('Source: ContactOut')
    expect(card()).toHaveAccessibleName('Decision-makers (1)')
    // the tab counter follows
    expect(screen.getByRole('link', { name: /^Contacts 1$/ })).toBeInTheDocument()
  })

  it('explains what is missing before sending anything', async () => {
    await open('c_004')
    const { user, dialog } = await openAddDialog()
    await user.click(within(dialog).getByRole('button', { name: 'Add contact' }))
    expect(await within(dialog).findByText('Enter a first name.')).toBeInTheDocument()
    expect(within(dialog).getByText('Enter a last name.')).toBeInTheDocument()
    expect(company('c_004')?.contacts).toHaveLength(0)
  })

  it('does not save an email without a source (AT-06)', async () => {
    await open('c_004')
    const { user, dialog } = await openAddDialog()
    await fillBasics(dialog, user, 'Omar', 'Sabry')
    await user.click(within(dialog).getByRole('button', { name: 'Add an email' }))
    await user.type(within(dialog).getByLabelText('Email 1'), 'omar.sabry@example.com')
    await user.click(within(dialog).getByRole('button', { name: 'Add contact' }))
    expect(await within(dialog).findByText('Say where this email came from.')).toBeInTheDocument()
    expect(company('c_004')?.contacts).toHaveLength(0)

    // once a source is chosen it saves
    await user.selectOptions(within(dialog).getByLabelText('Source of email 1'), 'website')
    await user.click(within(dialog).getByRole('button', { name: 'Add contact' }))
    await waitFor(() => expect(company('c_004')?.contacts).toHaveLength(1))
  })

  it('rejects a bad email address and a bad profile address', async () => {
    await open('c_004')
    const { user, dialog } = await openAddDialog()
    await fillBasics(dialog, user, 'Omar', 'Sabry')
    await user.type(within(dialog).getByLabelText('Profile address'), 'not a link')
    await user.click(within(dialog).getByRole('button', { name: 'Add an email' }))
    await user.type(within(dialog).getByLabelText('Email 1'), 'no-at-sign')
    await user.selectOptions(within(dialog).getByLabelText('Source of email 1'), 'manual')
    await user.click(within(dialog).getByRole('button', { name: 'Add contact' }))
    expect(await within(dialog).findByText('Enter a valid email address.')).toBeInTheDocument()
    expect(within(dialog).getByText(/starting with http/i)).toBeInTheDocument()
    expect(company('c_004')?.contacts).toHaveLength(0)
  })

  it('shows the server explanation when an email is on the opt-out list, and stays open', async () => {
    await open('c_004')
    const { user, dialog } = await openAddDialog()
    await fillBasics(dialog, user, 'Opt', 'Out')
    await user.click(within(dialog).getByRole('button', { name: 'Add an email' }))
    await user.type(within(dialog).getByLabelText('Email 1'), 'optout@example.com')
    await user.selectOptions(within(dialog).getByLabelText('Source of email 1'), 'manual')
    await user.click(within(dialog).getByRole('button', { name: 'Add contact' }))
    expect(await within(dialog).findByText(/on the opt-out list/i)).toBeInTheDocument()
    expect(screen.getByRole('dialog', { name: 'Add a contact' })).toBeInTheDocument()
    expect(company('c_004')?.contacts).toHaveLength(0)
  })

  it('can remove an email row before saving', async () => {
    await open('c_004')
    const { user, dialog } = await openAddDialog()
    await user.click(within(dialog).getByRole('button', { name: 'Add an email' }))
    expect(within(dialog).getByLabelText('Email 1')).toBeInTheDocument()
    await user.click(within(dialog).getByRole('button', { name: 'Remove email 1' }))
    expect(within(dialog).queryByLabelText('Email 1')).not.toBeInTheDocument()
  })
})

describe('Saving the same person again (AT-05)', () => {
  it('warns that the contact exists and updates it instead of adding a second one', async () => {
    const c = company('c_001')
    const existing = c?.contacts[0]
    const before = c?.contacts.length as number
    await open('c_001')
    const { user, dialog } = await openAddDialog()
    // same name, different capitals
    await user.type(
      within(dialog).getByLabelText('First name'),
      (existing?.firstName as string).toUpperCase(),
    )
    await user.type(
      within(dialog).getByLabelText('Last name'),
      (existing?.lastName as string).toLowerCase(),
    )
    expect(await within(dialog).findByRole('status')).toHaveTextContent('already on this company')
    expect(within(dialog).getByRole('button', { name: 'Update contact' })).toBeInTheDocument()

    await user.type(within(dialog).getByLabelText('Job title'), 'Group Chief Executive')
    await user.click(within(dialog).getByRole('button', { name: 'Update contact' }))
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())

    expect(company('c_001')?.contacts).toHaveLength(before)
    expect(company('c_001')?.contacts.find((p) => p.id === existing?.id)?.title).toBe(
      'Group Chief Executive',
    )
    expect(card()).toHaveAccessibleName(`Decision-makers (${before})`)
  })

  it('adding the same new person twice leaves one contact', async () => {
    await open('c_004')
    for (let round = 0; round < 2; round++) {
      const { user, dialog } = await openAddDialog()
      await user.type(within(dialog).getByLabelText('First name'), 'Layla')
      await user.type(within(dialog).getByLabelText('Last name'), 'Mansour')
      await user.click(within(dialog).getByRole('button', { name: /Add contact|Update contact/ }))
      await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
      await waitFor(() => expect(company('c_004')?.contacts.length).toBeGreaterThanOrEqual(1))
    }
    expect(company('c_004')?.contacts).toHaveLength(1)
  })

  it('allows several different decision-makers for one company', async () => {
    await open('c_004')
    for (const [first, last] of [
      ['Sara', 'Aziz'],
      ['Tariq', 'Darwish'],
      ['Noor', 'Karimi'],
    ]) {
      const { user, dialog } = await openAddDialog()
      await user.type(within(dialog).getByLabelText('First name'), first as string)
      await user.type(within(dialog).getByLabelText('Last name'), last as string)
      await user.click(within(dialog).getByRole('button', { name: 'Add contact' }))
      await waitFor(() =>
        expect(company('c_004')?.contacts.some((p) => p.lastName === last)).toBe(true),
      )
      await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    }
    expect(company('c_004')?.contacts).toHaveLength(3)
    // one company record, no matter how many people
    expect(db.companies.filter((c) => c.id === 'c_004')).toHaveLength(1)
  })

  it('takes a company out of the "no contacts" review queue', async () => {
    const target = reviewItems('contacts')[0]
    expect(target).toBeTruthy()
    const before = reviewItems('contacts').length
    await open(target?.companyId as string)
    const { user, dialog } = await openAddDialog()
    await user.type(within(dialog).getByLabelText('First name'), 'Hassan')
    await user.type(within(dialog).getByLabelText('Last name'), 'Rahman')
    await user.click(within(dialog).getByRole('button', { name: 'Add contact' }))
    await waitFor(() => expect(reviewItems('contacts')).toHaveLength(before - 1))
  })

  it('records the addition in the History tab', async () => {
    const { router } = await open('c_004')
    const { user, dialog } = await openAddDialog()
    await user.type(within(dialog).getByLabelText('First name'), 'Yusuf')
    await user.type(within(dialog).getByLabelText('Last name'), 'Haddad')
    await user.click(within(dialog).getByRole('button', { name: 'Add contact' }))
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    await router.navigate('/companies/c_004/history')
    const list = await screen.findByRole('list', { name: 'Change history' })
    expect(within(list).getAllByRole('listitem')[0]).toHaveTextContent('Yusuf Haddad')
  })
})

describe('Editing a contact', () => {
  it('opens with the saved values, keeps an email check result, and can add another email', async () => {
    const c = company('c_001')
    const person = c?.contacts.find((p) =>
      p.emails.some((e) => e.verification.status === 'verified'),
    ) as NonNullable<typeof c>['contacts'][number]
    const verified = person.emails.find((e) => e.verification.status === 'verified')
    const name = `${person.firstName} ${person.lastName}`
    await open('c_001')
    const user = userEvent.setup()
    await user.click(within(card()).getByRole('button', { name: `Edit ${name}` }))
    const dialog = await screen.findByRole('dialog', { name: `Edit ${name}` })
    expect(within(dialog).getByLabelText('First name')).toHaveValue(person.firstName)
    expect(within(dialog).getByLabelText('Job title')).toHaveValue(person.title)
    expect(within(dialog).getByLabelText('Email 1')).toHaveValue(person.emails[0]?.address)

    await user.clear(within(dialog).getByLabelText('Job title'))
    await user.type(within(dialog).getByLabelText('Job title'), 'Executive Chair')
    await user.click(within(dialog).getByRole('button', { name: 'Add an email' }))
    const n = person.emails.length + 1
    await user.type(within(dialog).getByLabelText(`Email ${n}`), 'second.address@example.com')
    await user.selectOptions(within(dialog).getByLabelText(`Source of email ${n}`), 'manual')
    await user.click(within(dialog).getByRole('button', { name: 'Save changes' }))
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())

    const after = company('c_001')?.contacts.find((p) => p.id === person.id)
    expect(after?.title).toBe('Executive Chair')
    expect(after?.emails.map((e) => e.address)).toContain('second.address@example.com')
    // the earlier check result stays
    expect(after?.emails.find((e) => e.address === verified?.address)?.verification.status).toBe(
      'verified',
    )
    expect(company('c_001')?.contacts).toHaveLength(c?.contacts.length as number)
  })

  it('will not save an old email that has no source until one is chosen', async () => {
    const person = company('c_001')?.contacts[0]
    if (person?.emails[0]) person.emails[0].provider = undefined
    await open('c_001')
    const user = userEvent.setup()
    await user.click(
      within(card()).getByRole('button', { name: `Edit ${person?.firstName} ${person?.lastName}` }),
    )
    const dialog = await screen.findByRole('dialog')
    await user.click(within(dialog).getByRole('button', { name: 'Save changes' }))
    expect(await within(dialog).findByText('Say where this email came from.')).toBeInTheDocument()
    await user.selectOptions(within(dialog).getByLabelText('Source of email 1'), 'website')
    await user.click(within(dialog).getByRole('button', { name: 'Save changes' }))
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    expect(person?.emails[0]?.provider).toBe('website')
  })
})

describe('Deleting a contact', () => {
  it('asks first, then removes the person (admin)', async () => {
    const c = company('c_001')
    const person = c?.contacts[0]
    const name = `${person?.firstName} ${person?.lastName}`
    const before = c?.contacts.length as number
    await open('c_001')
    const user = userEvent.setup()
    await user.click(within(card()).getByRole('button', { name: `Delete ${name}` }))
    const confirm = await screen.findByRole('dialog', { name: `Delete ${name}?` })
    expect(confirm).toHaveTextContent('emails and drafts are deleted too')
    // nothing is deleted until confirmed
    expect(company('c_001')?.contacts).toHaveLength(before)
    await user.click(within(confirm).getByRole('button', { name: 'Delete' }))
    await waitFor(() => expect(company('c_001')?.contacts).toHaveLength(before - 1))
    await waitFor(() => expect(within(card()).queryByText(name)).not.toBeInTheDocument())
  })

  it('keeps the person when cancelled', async () => {
    const c = company('c_001')
    const person = c?.contacts[0]
    const name = `${person?.firstName} ${person?.lastName}`
    await open('c_001')
    const user = userEvent.setup()
    await user.click(within(card()).getByRole('button', { name: `Delete ${name}` }))
    await user.click(
      within(await screen.findByRole('dialog')).getByRole('button', { name: 'Cancel' }),
    )
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    expect(company('c_001')?.contacts).toHaveLength(c?.contacts.length as number)
  })

  it('hides delete from a reviewer but still lets them edit', async () => {
    await api.post('/auth/logout')
    window.history.replaceState({}, '', '/?mock_role=reviewer')
    const person = company('c_001')?.contacts[0]
    await open('c_001')
    const name = `${person?.firstName} ${person?.lastName}`
    expect(within(card()).queryByRole('button', { name: /^Delete / })).not.toBeInTheDocument()
    expect(within(card()).getByRole('button', { name: `Edit ${name}` })).toBeInTheDocument()
  })
})
