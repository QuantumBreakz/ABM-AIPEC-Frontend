import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { api } from '@/api/client'
import { db } from '@/mocks/db'
import { setupMockApi, signIn } from '@/test/mockApi'
import { renderApp } from '@/test/renderApp'

setupMockApi()
beforeEach(() => signIn())

async function open(path: string, heading: string) {
  const app = renderApp(path)
  await screen.findByRole('heading', { level: 1, name: heading }, { timeout: 4000 })
  return { ...app, user: userEvent.setup() }
}

describe('Access', () => {
  it('shows a reviewer no admin screens and no admin links', async () => {
    await api.post('/auth/logout')
    await signIn('reviewer@example.com')
    for (const path of ['/admin/users', '/admin/providers', '/admin/suppressions']) {
      const { unmount } = renderApp(path)
      expect(
        await screen.findByRole('heading', { name: 'You do not have access to this page' }),
      ).toBeInTheDocument()
      expect(screen.queryByRole('button', { name: 'Add user' })).not.toBeInTheDocument()
      expect(screen.queryByRole('link', { name: 'Users' })).not.toBeInTheDocument()
      expect(screen.queryByRole('link', { name: 'Suppressions' })).not.toBeInTheDocument()
      unmount()
    }
  })
})

describe('Users', () => {
  it('lists everyone, marks you, and does not let you change or delete yourself', async () => {
    await open('/admin/users', 'Users')
    const table = await screen.findByRole('table', { name: 'Users' })
    expect(within(table).getAllByRole('row')).toHaveLength(db.users.length + 1)
    const mine = within(table).getByRole('rowheader', { name: /admin@example.com/ })
    expect(mine).toHaveTextContent('You')
    expect(within(table).getByLabelText('Role of admin@example.com')).toBeDisabled()
    expect(
      within(table).queryByRole('button', { name: 'Delete admin@example.com' }),
    ).not.toBeInTheDocument()
    expect(
      within(table).getByRole('button', { name: 'Delete reviewer@example.com' }),
    ).toBeInTheDocument()
  })

  it('adds a user, and explains an existing email or a short password', async () => {
    const { user } = await open('/admin/users', 'Users')
    await user.click(await screen.findByRole('button', { name: 'Add user' }))
    const dialog = await screen.findByRole('dialog', { name: 'Add a user' })

    await user.type(within(dialog).getByLabelText('Email'), 'new.person@example.com')
    await user.type(within(dialog).getByLabelText('Password'), 'short')
    await user.click(within(dialog).getByRole('button', { name: 'Add user' }))
    expect(await within(dialog).findByText('Use at least 8 characters.')).toBeInTheDocument()

    await user.clear(within(dialog).getByLabelText('Email'))
    await user.type(within(dialog).getByLabelText('Email'), 'reviewer@example.com')
    await user.clear(within(dialog).getByLabelText('Password'))
    await user.type(within(dialog).getByLabelText('Password'), 'long-enough-password')
    await user.click(within(dialog).getByRole('button', { name: 'Add user' }))
    expect(await within(dialog).findByText(/already exists/)).toBeInTheDocument()

    await user.clear(within(dialog).getByLabelText('Email'))
    await user.type(within(dialog).getByLabelText('Email'), 'new.person@example.com')
    await user.selectOptions(within(dialog).getByLabelText('Role'), 'admin')
    await user.click(within(dialog).getByRole('button', { name: 'Add user' }))
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    const added = db.users.find((u) => u.email === 'new.person@example.com')
    expect(added?.role).toBe('admin')
    expect(await screen.findByRole('rowheader', { name: /new.person@example.com/ })).toBeVisible()
  })

  it('changes a role', async () => {
    const { user } = await open('/admin/users', 'Users')
    const select = await screen.findByLabelText('Role of reviewer@example.com')
    await user.selectOptions(select, 'admin')
    await waitFor(() =>
      expect(db.users.find((u) => u.email === 'reviewer@example.com')?.role).toBe('admin'),
    )
  })

  it('resets a password only when both entries match', async () => {
    const { user } = await open('/admin/users', 'Users')
    await user.click(
      await screen.findByRole('button', { name: 'Reset password for reviewer@example.com' }),
    )
    const dialog = await screen.findByRole('dialog', { name: 'Reset password' })
    await user.type(within(dialog).getByLabelText('New password'), 'brand-new-password')
    await user.type(within(dialog).getByLabelText('Type it again'), 'something-else-here')
    await user.click(within(dialog).getByRole('button', { name: 'Change password' }))
    expect(await within(dialog).findByText('The two passwords do not match.')).toBeInTheDocument()

    await user.clear(within(dialog).getByLabelText('Type it again'))
    await user.type(within(dialog).getByLabelText('Type it again'), 'brand-new-password')
    await user.click(within(dialog).getByRole('button', { name: 'Change password' }))
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    expect(db.users.find((u) => u.email === 'reviewer@example.com')?.password).toBe(
      'brand-new-password',
    )
  })

  it('deletes a user only after confirming', async () => {
    const { user } = await open('/admin/users', 'Users')
    await user.click(await screen.findByRole('button', { name: 'Delete reviewer@example.com' }))
    const confirm = await screen.findByRole('dialog', { name: 'Delete reviewer@example.com?' })
    await user.click(within(confirm).getByRole('button', { name: 'Cancel' }))
    expect(db.users.some((u) => u.email === 'reviewer@example.com')).toBe(true)

    await user.click(screen.getByRole('button', { name: 'Delete reviewer@example.com' }))
    await user.click(
      within(await screen.findByRole('dialog', { name: 'Delete reviewer@example.com?' })).getByRole(
        'button',
        { name: 'Delete' },
      ),
    )
    await waitFor(() =>
      expect(db.users.some((u) => u.email === 'reviewer@example.com')).toBe(false),
    )
  })
})

describe('Providers', () => {
  it('says what is on and what happens by hand while each tool is off', async () => {
    db.providers.contactout = false
    db.providers.millionverifier = true
    db.providers.llm = false
    await open('/admin/providers', 'Providers')
    const off = await screen.findByRole('region', { name: 'ContactOut' })
    expect(off).toHaveTextContent('Off')
    expect(off).toHaveTextContent(/While it is off/)
    expect(screen.getByRole('region', { name: 'MillionVerifier' })).toHaveTextContent('On')
    expect(screen.getByRole('region', { name: 'MillionVerifier' })).not.toHaveTextContent(
      /While it is off/,
    )
    expect(screen.getByRole('region', { name: 'Language model' })).toHaveTextContent(
      /personalization step stays Pending/,
    )
    expect(screen.getByText(/never signs in or collects anything from LinkedIn/)).toBeVisible()
    // read only: nothing to switch, type into or save
    expect(screen.queryByRole('switch')).not.toBeInTheDocument()
    expect(screen.queryByRole('checkbox')).not.toBeInTheDocument()
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument()
  })

  it('MillionVerifier off explains that nothing can become Verified', async () => {
    db.providers.millionverifier = false
    await open('/admin/providers', 'Providers')
    expect(await screen.findByRole('region', { name: 'MillionVerifier' })).toHaveTextContent(
      /cannot mark any email as Verified/,
    )
  })
})

describe('Suppressions', () => {
  it('lists them with what each applies to', async () => {
    await open('/admin/suppressions', 'Suppressions')
    const table = await screen.findByRole('table', { name: 'Suppressed emails and domains' })
    expect(within(table).getAllByRole('row')).toHaveLength(db.suppressions.length + 1)
    for (const s of db.suppressions) {
      const row = within(table)
        .getByRole('rowheader', { name: s.value })
        .closest('tr') as HTMLElement
      expect(row).toHaveTextContent(s.value.includes('@') ? 'Email address' : 'Whole domain')
    }
  })

  it('adds an email or a domain, and refuses bad or repeated values', async () => {
    const { user } = await open('/admin/suppressions', 'Suppressions')
    const field = await screen.findByLabelText('Email or domain')
    await user.type(field, 'not valid')
    await user.click(screen.getByRole('button', { name: 'Add' }))
    expect(await screen.findByText(/Enter an email address, or a domain/)).toBeInTheDocument()

    await user.clear(field)
    await user.type(field, 'Opt-Out.example.org')
    await user.type(screen.getByLabelText('Reason (optional)'), 'Asked by email')
    await user.click(screen.getByRole('button', { name: 'Add' }))
    await waitFor(() =>
      expect(db.suppressions.some((s) => s.value === 'opt-out.example.org')).toBe(true),
    )
    expect(db.suppressions[0]?.reason).toBe('Asked by email')

    await user.type(await screen.findByLabelText('Email or domain'), 'opt-out.example.org')
    await user.click(screen.getByRole('button', { name: 'Add' }))
    expect(await screen.findByText(/already suppressed/)).toBeInTheDocument()
  })

  it('removes an entry only after confirming', async () => {
    const { user } = await open('/admin/suppressions', 'Suppressions')
    const target = db.suppressions[0]?.value as string
    await user.click(await screen.findByRole('button', { name: `Remove ${target}` }))
    const confirm = await screen.findByRole('dialog', { name: `Remove ${target}?` })
    await user.click(within(confirm).getByRole('button', { name: 'Remove' }))
    await waitFor(() => expect(db.suppressions.some((s) => s.value === target)).toBe(false))
  })

  it('a suppressed address can no longer be saved as a contact', async () => {
    const value = db.suppressions.find((s) => s.value.includes('@'))?.value
    if (!value) return
    const companyId = db.companies[0]?.id as string
    await expect(
      api.post(`/companies/${companyId}/contacts`, {
        firstName: 'Test',
        lastName: 'Person',
        source: 'manual',
        emails: [{ address: value, provider: 'manual' }],
      }),
    ).rejects.toThrow(/opt-out/)
  })
})
