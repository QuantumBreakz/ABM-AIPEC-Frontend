import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { STEP_KEYS } from '@/api/types'
import { db } from '@/mocks/db'
import { setupMockApi, signIn } from '@/test/mockApi'
import { renderApp } from '@/test/renderApp'

setupMockApi()
beforeEach(() => signIn())

const company = (id: string) => db.companies.find((c) => c.id === id)

async function open(path: string, name?: string) {
  const app = renderApp(path)
  await screen.findByRole('heading', { level: 1, name }, { timeout: 4000 })
  return app
}

describe('Company header', () => {
  it('shows the name, website, editions and how complete the research is', async () => {
    const c = company('c_001')
    await open('/companies/c_001', c?.name)
    expect(screen.getByRole('link', { name: /example\.com/ })).toHaveAttribute(
      'href',
      new URL(c?.website.url as string).href,
    )
    expect(screen.getByText('2026, 2025')).toBeInTheDocument()
    expect(screen.getByRole('progressbar', { name: 'Research completeness' })).toHaveAttribute(
      'aria-valuenow',
      String(c?.completeness),
    )
    expect(screen.getByRole('link', { name: /all companies/i })).toHaveAttribute(
      'href',
      '/companies',
    )
  })

  it('names the browser tab after the company', async () => {
    const c = company('c_001')
    await open('/companies/c_001', c?.name)
    expect(document.title).toBe(`${c?.name} · ADIPEC Lead Gen`)
  })

  it('says why the website is missing instead of leaving it blank', async () => {
    const c = company('c_012') // profile failed, no website found
    expect(c?.website.url).toBeUndefined()
    await open('/companies/c_012', c?.name)
    expect(screen.getByText('Website:').parentElement).toHaveTextContent(/Not available/)
  })

  it('warns about a possible duplicate and links to the other record', async () => {
    const dup = db.companies.find((c) => c.duplicateOf)
    const other = company(dup?.duplicateOf as string)
    await open(`/companies/${dup?.id}`, dup?.name)
    const note = await screen.findByRole('note')
    expect(note).toHaveTextContent('This record may be a duplicate.')
    const link = await within(note).findByRole('link', { name: other?.name as string })
    expect(link).toHaveAttribute('href', `/companies/${other?.id}`)
    expect(within(note).getByRole('link', { name: /duplicate review queue/ })).toHaveAttribute(
      'href',
      '/review/duplicate',
    )
  })

  it('shows no duplicate warning for a normal company', async () => {
    await open('/companies/c_001', company('c_001')?.name)
    expect(screen.queryByRole('note')).not.toBeInTheDocument()
  })
})

describe('Steps panel', () => {
  it('lists all eight steps in order with their status', async () => {
    await open('/companies/c_001', company('c_001')?.name)
    const steps = screen.getByRole('region', { name: 'Steps' })
    const items = within(steps).getAllByRole('listitem')
    expect(items).toHaveLength(STEP_KEYS.length)
    expect(items[0]).toHaveTextContent('ADIPEC profile')
    expect(items[7]).toHaveTextContent('Personalization')
    expect(items[0]).toHaveTextContent('Completed')
  })

  it('shows the full reason of a step that did not finish', async () => {
    const c = company('c_002') // website failed
    await open('/companies/c_002', c?.name)
    const steps = screen.getByRole('region', { name: 'Steps' })
    const website = within(steps)
      .getAllByRole('listitem')
      .find((li) => li.textContent?.includes('Website'))
    expect(website).toHaveTextContent('Failed')
    expect(website).toHaveTextContent('Website did not respond (timed out after 30 s).')
  })

  it('admits when a problem step has no recorded reason', async () => {
    const c = company('c_001')
    if (c) c.stages.emails = { status: 'failed' }
    await open('/companies/c_001', c?.name)
    const steps = screen.getByRole('region', { name: 'Steps' })
    const emails = within(steps)
      .getAllByRole('listitem')
      .find((li) => li.textContent?.startsWith('Emails'))
    expect(emails).toHaveTextContent('No reason was recorded.')
  })

  it('stays quiet about steps that are simply not started', async () => {
    const c = company('c_012')
    await open('/companies/c_012', c?.name)
    const steps = screen.getByRole('region', { name: 'Steps' })
    const social = within(steps)
      .getAllByRole('listitem')
      .find((li) => li.textContent?.includes('Social profiles'))
    expect(social).toHaveTextContent('Not started')
    expect(social).not.toHaveTextContent('No reason was recorded.')
  })
})

describe('ADIPEC tab', () => {
  it('has one card per edition with everything that was published', async () => {
    const c = company('c_001')
    await open('/companies/c_001', c?.name)
    const card2026 = screen.getByRole('region', { name: 'ADIPEC 2026' })
    const e = c?.editions.find((x) => x.edition === 2026)
    // read each value through its label (a value like "Oil & Gas" can also appear as an extra field)
    const valueOf = (label: string) =>
      within(card2026).getByText(label, { selector: 'dt' }).nextElementSibling
    expect(valueOf('Stand')).toHaveTextContent(e?.stand as string)
    expect(valueOf('Category')).toHaveTextContent(e?.category as string)
    expect(valueOf('Country')).toHaveTextContent(e?.country as string)
    expect(valueOf('Description')).toHaveTextContent(e?.description as string)
    expect(within(card2026).getByText(/Captured/)).toBeInTheDocument()
    expect(within(card2026).getByRole('link', { name: /Open the ADIPEC profile/ })).toHaveAttribute(
      'href',
      e?.profileUrl,
    )
    // the older edition has its own card
    expect(screen.getByRole('region', { name: 'ADIPEC 2025' })).toBeInTheDocument()
    // newest first
    const headings = screen.getAllByRole('heading', { level: 2 }).map((h) => h.textContent)
    expect(headings.indexOf('ADIPEC 2026')).toBeLessThan(headings.indexOf('ADIPEC 2025'))
  })

  it('shows extra published fields too', async () => {
    const c = company('c_001')
    await open('/companies/c_001', c?.name)
    const card = screen.getByRole('region', { name: 'ADIPEC 2026' })
    const extra = c?.editions[0]?.extra ?? {}
    for (const [label, value] of Object.entries(extra)) {
      expect(within(card).getByText(label)).toBeInTheDocument()
      expect(within(card).getAllByText(value).length).toBeGreaterThan(0)
    }
  })

  it('shows "Not available" with the reason for every missing field (AT-02)', async () => {
    const c = company('c_012') // profile page returned 404, nothing was captured
    await open('/companies/c_012', c?.name)
    const card = screen.getByRole('region', { name: 'ADIPEC 2026' })
    // four fields are missing for one reason, so the card states it once and each row says "Not available"
    expect(within(card).getAllByText('Profile page returned 404.')).toHaveLength(1)
    for (const label of ['Stand', 'Category', 'Country', 'Description']) {
      const row = within(card).getByText(label).nextElementSibling as HTMLElement
      expect(row).toHaveTextContent('Not available')
    }
    // the profile link and capture date are still there
    expect(within(card).getByRole('link', { name: /Open the ADIPEC profile/ })).toBeInTheDocument()
  })

  it('says ADIPEC did not publish a field when the profile itself worked', async () => {
    const c = company('c_001')
    if (c?.editions[0]) c.editions[0].stand = undefined
    await open('/companies/c_001', c?.name)
    const card = screen.getByRole('region', { name: 'ADIPEC 2026' })
    const row = within(card).getByText('Stand').nextElementSibling as HTMLElement
    expect(row).toHaveTextContent('Not available')
    expect(row).toHaveTextContent('ADIPEC did not publish this')
  })
})

describe('Tabs', () => {
  it('shows all six tabs as links, with the current one marked and a contacts count', async () => {
    const c = company('c_001')
    await open('/companies/c_001', c?.name)
    const nav = screen.getByRole('navigation', { name: 'Company sections' })
    const links = within(nav).getAllByRole('link')
    expect(links.map((l) => l.textContent?.replace(/\s*\d+$/, ''))).toEqual([
      'ADIPEC',
      'Website',
      'Socials',
      'Contacts',
      'AI',
      'History',
    ])
    expect(within(nav).getByRole('link', { name: 'ADIPEC' })).toHaveAttribute(
      'aria-current',
      'page',
    )
    expect(
      within(nav).getByRole('link', { name: `Contacts ${c?.contacts.length}` }),
    ).toBeInTheDocument()
  })

  it('gives every tab its own address that can be opened directly', async () => {
    const c = company('c_001')
    const { router } = await open('/companies/c_001', c?.name)
    await userEvent.setup().click(
      within(screen.getByRole('navigation', { name: 'Company sections' })).getByRole('link', {
        name: /^Contacts/,
      }),
    )
    await waitFor(() => expect(router.state.location.pathname).toBe('/companies/c_001/contacts'))
    expect(await screen.findByText('The contact list is being built')).toBeInTheDocument()
    expect(screen.getByRole('region', { name: 'Sales Navigator account' })).toBeInTheDocument()
    // the header and steps stay put
    expect(screen.getByRole('region', { name: 'Steps' })).toBeInTheDocument()
  })

  it('opens a tab from a deep link', async () => {
    await open('/companies/c_001/ai', company('c_001')?.name)
    expect(await screen.findByText(/AI tab is being built/)).toBeInTheDocument()
    expect(
      within(screen.getByRole('navigation', { name: 'Company sections' })).getByRole('link', {
        name: 'AI',
      }),
    ).toHaveAttribute('aria-current', 'page')
  })

  it('shows a 404 page for a tab that does not exist', async () => {
    renderApp('/companies/c_001/nope')
    expect(
      await screen.findByText('We could not find that page', {}, { timeout: 4000 }),
    ).toBeInTheDocument()
  })
})

describe('Loading and errors', () => {
  it('shows a not-found state for an unknown company, with a way back', async () => {
    renderApp('/companies/nope')
    expect(await screen.findByRole('alert', {}, { timeout: 4000 })).toHaveTextContent(
      /could not find/i,
    )
    expect(screen.getByRole('link', { name: /all companies/i })).toBeInTheDocument()
  })

  it('shows an error with a retry and recovers', async () => {
    window.history.replaceState({}, '', '/?mock_fail=/companies/c_001')
    renderApp('/companies/c_001')
    expect(await screen.findByRole('alert', {}, { timeout: 4000 })).toHaveTextContent(
      /could not load/i,
    )
    window.history.replaceState({}, '', '/')
    await userEvent.setup().click(screen.getByRole('button', { name: 'Try again' }))
    await screen.findByRole(
      'heading',
      { level: 1, name: company('c_001')?.name },
      { timeout: 4000 },
    )
  })
})
