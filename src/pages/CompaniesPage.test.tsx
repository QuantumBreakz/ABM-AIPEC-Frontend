import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { db } from '@/mocks/db'
import { setupMockApi, signIn } from '@/test/mockApi'
import { renderApp } from '@/test/renderApp'

setupMockApi()
beforeEach(async () => {
  await signIn()
  localStorage.clear()
})

/** Body rows only (the first row is the column headers). */
const dataRows = () => screen.getAllByRole('row').slice(1)
const rowNames = () => dataRows().map((r) => within(r).getAllByRole('link')[0]?.textContent)

async function open(path = '/companies') {
  const app = renderApp(path)
  await screen.findByRole('heading', { name: 'Companies' })
  // "1–50 of 150" only appears once real data has arrived (skeleton rows do not have it)
  await screen.findByText(/\d–\d+ of \d+|0 results/, {}, { timeout: 4000 })
  return app
}

describe('Company list', () => {
  it('shows 50 companies per page and the total', async () => {
    await open()
    expect(dataRows()).toHaveLength(50)
    expect(screen.getByText(`${db.companies.length} companies`)).toBeInTheDocument()
    expect(screen.getByText(`1–50 of ${db.companies.length}`)).toBeInTheDocument()
    for (const header of [
      'Company',
      'Country',
      'Progress',
      'Contacts',
      'Emails',
      'AI draft',
      'Complete',
      'Updated',
    ]) {
      expect(
        screen.getByRole('columnheader', { name: new RegExp(header, 'i') }),
      ).toBeInTheDocument()
    }
  })

  it('hides the Stand column until it is turned on', async () => {
    await open()
    expect(screen.queryByRole('columnheader', { name: /stand/i })).not.toBeInTheDocument()
    const user = userEvent.setup()
    await user.click(screen.getByRole('button', { name: /columns/i }))
    await user.click(await screen.findByRole('menuitemcheckbox', { name: /stand/i }))
    await user.keyboard('{Escape}') // close the menu; while open it hides the page from screen readers
    expect(await screen.findByRole('columnheader', { name: /stand/i })).toBeInTheDocument()
  })

  it('hides the secondary columns by default, so the table fits at 1280px', async () => {
    await open()
    for (const hidden of ['Website', 'Category', 'Stand']) {
      expect(
        screen.queryByRole('columnheader', { name: new RegExp(hidden, 'i') }),
      ).not.toBeInTheDocument()
    }
  })

  it('pins the Company column so it stays visible when scrolling sideways', async () => {
    await open()
    const header = screen.getByRole('columnheader', { name: /company/i })
    expect(header.className).toContain('sticky')
    const firstRowCell = dataRows()[0]?.querySelector('td')
    expect(firstRowCell?.className).toContain('sticky')
  })

  it('folds extra email states into "+N more" instead of growing the row', async () => {
    const company = db.companies.find((c) => Object.keys(c.emailsByStatus).length >= 3)
    expect(company).toBeTruthy()
    await open(`/companies?q=${encodeURIComponent(company?.name ?? '')}`)
    const row = await screen.findByRole('row', { name: `Open ${company?.name}` })
    const list = within(row).getByRole('list', { name: 'Emails by status' })
    // two pills + one "+N more"
    expect(within(list).getAllByRole('listitem')).toHaveLength(3)
    expect(within(list).getByText(/\+\d+ more/)).toBeInTheDocument()
  })

  it('keeps filters in the URL, so the same link gives the same results', async () => {
    const expected = db.companies.filter((c) => c.country === 'AE').length
    const first = await open('/companies?country=AE')
    expect(
      screen.getByText(`${expected} matching ${expected === 1 ? 'company' : 'companies'}`),
    ).toBeInTheDocument()
    const before = rowNames()
    first.unmount()

    // "Refresh": open the very same address again
    await open('/companies?country=AE')
    expect(rowNames()).toEqual(before)
  })

  it('searches as you type and writes it to the URL', async () => {
    const { router } = await open()
    const user = userEvent.setup()
    await user.type(screen.getByRole('searchbox', { name: 'Search' }), 'gulf')
    await waitFor(() => expect(router.state.location.search).toContain('q=gulf'), { timeout: 3000 })
    // Stale rows from before the search must disappear, so check everything in one retrying block.
    await waitFor(
      () => {
        expect(document.querySelector('header p')).toHaveTextContent(/matching compan/)
        expect(rowNames().length).toBeGreaterThan(0)
        for (const name of rowNames()) expect(name?.toLowerCase()).toContain('gulf')
      },
      { timeout: 5000 },
    )
  })

  it('offers the known editions as a dropdown and filters by it', async () => {
    const expected = db.companies.filter((c) => c.editions.some((e) => e.edition === 2025)).length
    await open('/companies?edition=2025')
    // the Filters panel opens by itself because a filter is active
    const select = (await screen.findByLabelText('Edition')) as HTMLSelectElement
    expect(select.value).toBe('2025')
    expect([...select.options].map((o) => o.textContent)).toEqual([
      'Any',
      'ADIPEC 2026',
      'ADIPEC 2025',
    ])
    expect(
      await screen.findByText(`${expected} matching ${expected === 1 ? 'company' : 'companies'}`),
    ).toBeInTheDocument()
  })

  it('sorts by clicking a heading: ascending, descending, then off', async () => {
    const { router } = await open()
    const user = userEvent.setup()
    const byName = [...db.companies].map((c) => c.name).sort((a, b) => a.localeCompare(b))

    await user.click(screen.getByRole('button', { name: /company/i }))
    await waitFor(() => expect(router.state.location.search).toBe('?sort=name'))
    expect(rowNames()[0]).toBe(byName[0])

    await user.click(screen.getByRole('button', { name: /company/i }))
    await waitFor(() => expect(router.state.location.search).toBe('?sort=-name'))
    await waitFor(() => expect(rowNames()[0]).toBe(byName[byName.length - 1]))

    await user.click(screen.getByRole('button', { name: /company/i }))
    await waitFor(() => expect(router.state.location.search).toBe(''))
  })

  it('pages forward and back, remembering the page in the URL', async () => {
    const { router } = await open()
    const user = userEvent.setup()
    const firstPage = rowNames()
    await user.click(screen.getByRole('button', { name: 'Next page' }))
    await waitFor(() => expect(router.state.location.search).toBe('?page=2'))
    await screen.findByText(`51–100 of ${db.companies.length}`)
    expect(rowNames()).not.toEqual(firstPage)
    await user.click(screen.getByRole('button', { name: 'Previous page' }))
    await waitFor(() => expect(router.state.location.search).toBe(''))
    await waitFor(() => expect(rowNames()).toEqual(firstPage))
  })

  it('shows an empty state with a Clear filters action', async () => {
    const { router } = await open('/companies?q=zzzzzz')
    expect(await screen.findByText('No companies match these filters')).toBeInTheDocument()
    const user = userEvent.setup()
    // there are two "Clear filters" buttons (toolbar and empty state); either one works
    await user.click(screen.getAllByRole('button', { name: 'Clear filters' })[0] as HTMLElement)
    await waitFor(() => expect(router.state.location.search).toBe(''))
    await waitFor(() => expect(dataRows()).toHaveLength(50))
  })

  it('recovers when asked for a page that does not exist', async () => {
    await open('/companies?page=99')
    expect(await screen.findByText('That page does not exist')).toBeInTheDocument()
    await userEvent.setup().click(screen.getByRole('button', { name: 'Go to the first page' }))
    await waitFor(() => expect(dataRows()).toHaveLength(50))
  })

  it('opens a company with a click or the Enter key', async () => {
    const { router } = await open('/companies?q=Gulf')
    const target = db.companies.find((c) => c.name.toLowerCase().includes('gulf'))
    const user = userEvent.setup()
    await user.click(await screen.findByRole('row', { name: `Open ${target?.name}` }))
    await screen.findByRole('heading', { name: 'Company' })
    expect(router.state.location.pathname).toBe(`/companies/${target?.id}`)

    await router.navigate('/companies?q=Gulf')
    const row = await screen.findByRole('row', { name: `Open ${target?.name}` })
    row.focus()
    await user.keyboard('{Enter}')
    await waitFor(() => expect(router.state.location.pathname).toBe(`/companies/${target?.id}`))
  })

  it('shows missing data as "Not available", never a blank', async () => {
    const company = db.companies.find((c) => !c.country)
    expect(company).toBeTruthy()
    await open(`/companies?q=${encodeURIComponent(company?.name ?? '')}`)
    const row = await screen.findByRole('row', { name: `Open ${company?.name}` })
    expect(within(row).getAllByText('Not available').length).toBeGreaterThan(0)
  })

  it('marks possible duplicates', async () => {
    await open('/companies?duplicate=true')
    const rows = dataRows()
    expect(rows.length).toBeGreaterThan(0)
    for (const row of rows) expect(within(row).getByText('Possible duplicate')).toBeInTheDocument()
  })

  it('summarises emails with a label, not just a colour', async () => {
    const company = db.companies.find((c) => c.emailsByStatus.verified && c.emailsByStatus.risky)
    expect(company).toBeTruthy()
    await open(`/companies?q=${encodeURIComponent(company?.name ?? '')}`)
    const row = await screen.findByRole('row', { name: `Open ${company?.name}` })
    expect(within(row).getByText(/Verified/)).toBeInTheDocument()
    expect(within(row).getByText(/Risky/)).toBeInTheDocument()
  })

  it('shows an error with a retry button and recovers', async () => {
    window.history.replaceState({}, '', '/?mock_fail=/companies')
    renderApp('/companies')
    expect(await screen.findByRole('alert', {}, { timeout: 4000 })).toHaveTextContent(
      /could not load/i,
    )
    window.history.replaceState({}, '', '/')
    await userEvent.setup().click(screen.getByRole('button', { name: 'Try again' }))
    await waitFor(() => expect(dataRows()).toHaveLength(50), { timeout: 4000 })
  })
})
