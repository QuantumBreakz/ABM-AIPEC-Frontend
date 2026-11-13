import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { delay, HttpResponse, http } from 'msw'
import { toast } from 'sonner'
import { api } from '@/api/client'
import { db } from '@/mocks/db'
import { server } from '@/mocks/server'
import { setupMockApi, signIn } from '@/test/mockApi'
import { renderApp } from '@/test/renderApp'

setupMockApi()
beforeEach(() => signIn())
afterEach(() => {
  server.resetHandlers()
  vi.restoreAllMocks()
})

const company = (id: string) => db.companies.find((c) => c.id === id)
const region = (name: string) => screen.getByRole('region', { name })
const valueOf = (card: HTMLElement, label: string) =>
  within(card).getByText(label, { selector: 'dt' }).nextElementSibling as HTMLElement

async function open(path: string, id: string) {
  const app = renderApp(path)
  await screen.findByRole('heading', { level: 1, name: company(id)?.name }, { timeout: 4000 })
  return app
}

/** Open the editor of a row, clear it and type a new value. */
async function replaceValue(label: string, text: string, submit: 'enter' | 'button' = 'enter') {
  const user = userEvent.setup()
  await user.click(screen.getByRole('button', { name: `Edit ${label}` }))
  const field = await screen.findByLabelText(label)
  await user.clear(field)
  if (text) await user.type(field, text)
  if (submit === 'enter' && (field as HTMLElement).tagName === 'INPUT')
    await user.keyboard('{Enter}')
  else await user.click(screen.getByRole('button', { name: 'Save' }))
  return user
}

describe('Editing in place', () => {
  it('changes the website address at once, locks the field and logs the change', async () => {
    const c = company('c_001')
    const before = c?.website.url
    await open('/companies/c_001/website', 'c_001')
    const user = await replaceValue('Website', 'https://new-site.example.com')

    const card = region('About the company')
    // the page shows the new value immediately, and the header follows
    await waitFor(() =>
      expect(within(valueOf(card, 'Website')).getByRole('link')).toHaveAttribute(
        'href',
        'https://new-site.example.com/',
      ),
    )
    expect(within(card).getByLabelText('Edited by a person')).toBeInTheDocument()
    expect(screen.getByText('Website:').parentElement).toHaveTextContent('new-site.example.com')

    // and it is in the History tab straight away
    await user.click(
      within(screen.getByRole('navigation', { name: 'Company sections' })).getByRole('link', {
        name: 'History',
      }),
    )
    const list = await screen.findByRole('list', { name: 'Change history' })
    const item = within(list).getAllByRole('listitem')[0] as HTMLElement
    expect(item).toHaveTextContent('Website address')
    expect(item).toHaveTextContent('admin@example.com')
    expect(item).toHaveTextContent(before as string)
    expect(item).toHaveTextContent('https://new-site.example.com')
  })

  it('explains a bad web address before anything is sent', async () => {
    const c = company('c_001')
    const before = c?.website.url
    await open('/companies/c_001/website', 'c_001')
    await replaceValue('Website', 'not a url')
    expect(await screen.findByRole('alert')).toHaveTextContent(
      /full web address starting with http/i,
    )
    // still editing, nothing saved
    expect(screen.getByLabelText('Website')).toBeInTheDocument()
    expect(company('c_001')?.website.url).toBe(before)
    expect(db.history.c_001).toBeUndefined()
  })

  it('shows Not available after a value is cleared', async () => {
    await open('/companies/c_001/website', 'c_001')
    await replaceValue('Summary', '', 'button')
    const card = region('About the company')
    await waitFor(() => expect(valueOf(card, 'Summary')).toHaveTextContent('Not available'))
    expect(company('c_001')?.website.summary).toBeUndefined()
  })

  it('edits a paragraph with the Save button', async () => {
    await open('/companies/c_001/website', 'c_001')
    await replaceValue('Summary', 'A brand new summary written by hand.', 'button')
    const card = region('About the company')
    await waitFor(() =>
      expect(valueOf(card, 'Summary')).toHaveTextContent('A brand new summary written by hand.'),
    )
    await waitFor(() =>
      expect(company('c_001')?.website.summary).toBe('A brand new summary written by hand.'),
    )
  })

  it('edits a list one item per line, dropping blanks and duplicates', async () => {
    await open('/companies/c_001/website', 'c_001')
    await replaceValue('Services', 'Pipelines\n\n  Drilling  \nPipelines', 'button')
    const card = region('About the company')
    await waitFor(() => {
      const tags = within(valueOf(card, 'Services')).getAllByRole('listitem')
      expect(tags.map((t) => t.textContent)).toEqual(['Pipelines', 'Drilling'])
    })
    await waitFor(() =>
      expect(company('c_001')?.website.services).toEqual(['Pipelines', 'Drilling']),
    )
  })

  it('cancels with Escape, keeps the old value and puts focus back on the Edit button', async () => {
    const c = company('c_001')
    await open('/companies/c_001/website', 'c_001')
    const user = userEvent.setup()
    await user.click(screen.getByRole('button', { name: 'Edit Summary' }))
    const field = await screen.findByLabelText('Summary')
    await user.type(field, ' EXTRA')
    await user.keyboard('{Escape}')
    expect(valueOf(region('About the company'), 'Summary')).toHaveTextContent(
      c?.website.summary as string,
    )
    expect(screen.queryByLabelText('Summary')).not.toBeInTheDocument()
    await waitFor(() => expect(screen.getByRole('button', { name: 'Edit Summary' })).toHaveFocus())
    expect(db.history.c_001).toBeUndefined()
  })

  it('sends nothing when the value did not change', async () => {
    await open('/companies/c_001/website', 'c_001')
    const user = userEvent.setup()
    await user.click(screen.getByRole('button', { name: 'Edit Summary' }))
    await user.click(await screen.findByRole('button', { name: 'Save' }))
    expect(db.history.c_001).toBeUndefined()
    expect(company('c_001')?.lockedFields).toEqual([])
    expect(
      within(region('About the company')).queryByLabelText('Edited by a person'),
    ).not.toBeInTheDocument()
  })

  it('lets a reviewer edit too', async () => {
    await api.post('/auth/logout')
    window.history.replaceState({}, '', '/?mock_role=reviewer')
    await open('/companies/c_001/website', 'c_001')
    await replaceValue('Summary', 'Reviewer wrote this.', 'button')
    await waitFor(() => expect(company('c_001')?.website.summary).toBe('Reviewer wrote this.'))
  })
})

describe('When the server refuses a change', () => {
  it('shows the change at once, then undoes it and says why', async () => {
    const c = company('c_001')
    const original = c?.website.summary as string
    const toastError = vi.spyOn(toast, 'error').mockImplementation(() => '')
    server.use(
      http.patch('*/api/companies/c_001', async () => {
        await delay(300)
        return HttpResponse.json(
          { error: { code: 'internal', message: 'The server had a problem.' } },
          { status: 500 },
        )
      }),
    )
    await open('/companies/c_001/website', 'c_001')
    await replaceValue('Summary', 'This will be refused.', 'button')

    const card = region('About the company')
    // optimistic: visible before the server has answered
    expect(valueOf(card, 'Summary')).toHaveTextContent('This will be refused.')
    expect(within(card).getByLabelText('Edited by a person')).toBeInTheDocument()

    // then rolled back, with an explanation
    await waitFor(() => expect(valueOf(card, 'Summary')).toHaveTextContent(original), {
      timeout: 3000,
    })
    expect(within(card).queryByLabelText('Edited by a person')).not.toBeInTheDocument()
    expect(toastError).toHaveBeenCalledWith(
      expect.stringContaining('was not saved and has been undone'),
    )
    expect(toastError).toHaveBeenCalledWith(expect.stringContaining('The server had a problem.'))
  })
})

describe('Locked fields', () => {
  it('marks only the fields a person has edited before', async () => {
    const c = company('c_015')
    expect(c?.lockedFields).toEqual(['website.summary', 'socials.linkedin'])
    await open('/companies/c_015/website', 'c_015')
    const card = region('About the company')
    expect(
      within(valueOf(card, 'Summary').parentElement as HTMLElement).getByLabelText(
        'Edited by a person',
      ),
    ).toBeInTheDocument()
    expect(within(card).getAllByLabelText('Edited by a person')).toHaveLength(1)
  })

  it('marks locked social profiles too', async () => {
    await open('/companies/c_015/socials', 'c_015')
    const card = region('Official social profiles')
    expect(within(card).getAllByLabelText('Edited by a person')).toHaveLength(1)
  })
})

describe('Socials editing', () => {
  it('adds a profile and a list of other links, rejecting bad links', async () => {
    await open('/companies/c_002/socials', 'c_002')
    await replaceValue('Facebook', 'https://www.facebook.com/zenith-gas')
    const card = region('Official social profiles')
    await waitFor(() =>
      expect(within(valueOf(card, 'Facebook')).getByRole('link')).toHaveAttribute(
        'href',
        'https://www.facebook.com/zenith-gas',
      ),
    )

    const user = userEvent.setup()
    await user.click(screen.getByRole('button', { name: 'Edit Other' }))
    const field = await screen.findByLabelText('Other')
    await user.type(field, 'https://www.tiktok.com/@zenith{Enter}oops')
    await user.click(screen.getByRole('button', { name: 'Save' }))
    expect(await screen.findByRole('alert')).toHaveTextContent(/http/i)
    await user.clear(field)
    await user.type(field, 'https://www.tiktok.com/@zenith')
    await user.click(screen.getByRole('button', { name: 'Save' }))
    await waitFor(() =>
      expect(company('c_002')?.socials.other).toEqual(['https://www.tiktok.com/@zenith']),
    )
  })
})

describe('Sales Navigator account (Contacts tab)', () => {
  it('records the account, the match confidence and the leadership coverage', async () => {
    await open('/companies/c_004/contacts', 'c_004')
    const card = region('Sales Navigator account')
    expect(card).toHaveTextContent('Coverage unconfirmed')
    expect(
      within(card).getByRole('link', { name: /Open the Sales Navigator search/ }),
    ).toHaveAttribute('href', company('c_004')?.salesNav.searchUrl)

    await replaceValue('Account page', 'https://www.linkedin.com/sales/company/12345')
    const user = userEvent.setup()

    await user.click(screen.getByRole('button', { name: 'Edit Match confidence' }))
    await user.selectOptions(await screen.findByLabelText('Match confidence'), 'high')
    await user.click(screen.getByRole('button', { name: 'Save' }))
    await waitFor(() => expect(valueOf(card, 'Match confidence')).toHaveTextContent('High'))

    await user.click(screen.getByRole('button', { name: 'Edit Leadership coverage' }))
    // the warning about Relationship Explorer is shown while choosing
    expect(screen.getByText(/shows only a limited set of people/i)).toBeInTheDocument()
    await user.selectOptions(await screen.findByLabelText('Leadership coverage'), 'reviewed')
    await user.click(screen.getByRole('button', { name: 'Save' }))
    await waitFor(() => expect(valueOf(card, 'Leadership coverage')).toHaveTextContent('Reviewed'))
    // once a person says they checked, the warning goes
    expect(card).not.toHaveTextContent('Coverage unconfirmed')

    await waitFor(() => {
      const c = company('c_004')
      expect(c?.salesNav.accountUrl).toBe('https://www.linkedin.com/sales/company/12345')
      expect(c?.salesNav.matchConfidence).toBe('high')
      expect(c?.leadershipCoverage).toBe('reviewed')
    })
  })

  it('never claims the list is complete unless it was reviewed', async () => {
    for (const coverage of ['unknown', 'confirmed_partial'] as const) {
      const c = company('c_004')
      if (c) c.leadershipCoverage = coverage
      const { unmount } = await open('/companies/c_004/contacts', 'c_004')
      expect(region('Sales Navigator account')).toHaveTextContent('Coverage unconfirmed')
      unmount()
    }
  })
})

describe('Changing a step by hand', () => {
  async function openDialog() {
    await open('/companies/c_002', 'c_002')
    const user = userEvent.setup()
    await user.click(screen.getByRole('button', { name: 'Change status of Website' }))
    const dialog = await screen.findByRole('dialog', { name: 'Change status: Website' })
    return { user, dialog }
  }

  it('shows the current status and reason, and requires a reason of your own', async () => {
    const { user, dialog } = await openDialog()
    expect(dialog).toHaveTextContent('Currently Failed')
    expect(dialog).toHaveTextContent('Website did not respond (timed out after 30 s).')
    await user.selectOptions(within(dialog).getByLabelText('New status'), 'completed')
    await user.click(within(dialog).getByRole('button', { name: 'Change status' }))
    expect(await within(dialog).findByText(/Give a short reason/)).toBeInTheDocument()
    // nothing changed
    expect(company('c_002')?.stages.website.status).toBe('failed')
  })

  it('changes the step, shows the reason, updates completeness and logs it', async () => {
    const before = company('c_002')?.completeness as number
    const { user, dialog } = await openDialog()
    await user.selectOptions(within(dialog).getByLabelText('New status'), 'completed')
    await user.type(within(dialog).getByLabelText('Reason'), 'Checked by hand: the site works.')
    await user.click(within(dialog).getByRole('button', { name: 'Change status' }))

    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    const steps = screen.getByRole('region', { name: 'Steps' })
    const website = within(steps)
      .getAllByRole('listitem')
      .find((li) => li.textContent?.includes('Website')) as HTMLElement
    expect(website).toHaveTextContent('Completed')
    expect(website).toHaveTextContent('Checked by hand: the site works.')
    expect(
      Number(
        screen
          .getByRole('progressbar', { name: 'Research completeness' })
          .getAttribute('aria-valuenow'),
      ),
    ).toBeGreaterThan(before)

    await user.click(
      within(screen.getByRole('navigation', { name: 'Company sections' })).getByRole('link', {
        name: 'History',
      }),
    )
    const item = within(await screen.findByRole('list', { name: 'Change history' })).getAllByRole(
      'listitem',
    )[0] as HTMLElement
    expect(item).toHaveTextContent('Website status')
    expect(item).toHaveTextContent('failed')
    expect(item).toHaveTextContent('completed')
    expect(item).toHaveTextContent('admin@example.com')
  })

  it('cancels without changing anything', async () => {
    const { user, dialog } = await openDialog()
    await user.click(within(dialog).getByRole('button', { name: 'Cancel' }))
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    expect(company('c_002')?.stages.website.status).toBe('failed')
  })
})

describe('History tab', () => {
  it('says so when nothing has changed', async () => {
    await open('/companies/c_001/history', 'c_001')
    expect(await screen.findByText('No changes yet')).toBeInTheDocument()
  })

  it('lists changes newest first with plain names and "(empty)" for missing values', async () => {
    const c = company('c_015')
    await open('/companies/c_015/history', 'c_015')
    const items = within(await screen.findByRole('list', { name: 'Change history' })).getAllByRole(
      'listitem',
    )
    expect(items).toHaveLength(2)
    expect(items[0]).toHaveTextContent('Website summary')
    expect(items[0]).toHaveTextContent('Auto summary.')
    expect(items[0]).toHaveTextContent(c?.website.summary as string)
    expect(items[0]).toHaveTextContent('reviewer@example.com')
    expect(items[1]).toHaveTextContent('LinkedIn')
    expect(items[1]).toHaveTextContent('(empty)')
    expect(items[1]).toHaveTextContent('admin@example.com')
  })

  it('shows an error with a retry and recovers', async () => {
    window.history.replaceState({}, '', '/?mock_fail=/history')
    renderApp('/companies/c_001/history')
    expect(await screen.findByRole('alert', {}, { timeout: 4000 })).toHaveTextContent(
      /could not load/i,
    )
    window.history.replaceState({}, '', '/')
    await userEvent.setup().click(screen.getByRole('button', { name: 'Try again' }))
    expect(await screen.findByText('No changes yet', {}, { timeout: 4000 })).toBeInTheDocument()
  })
})
