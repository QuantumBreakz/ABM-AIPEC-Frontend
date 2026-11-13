import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { STEP_KEYS } from '@/api/types'
import { db } from '@/mocks/db'
import { buildOverview } from '@/mocks/stats'
import { setupMockApi, signIn } from '@/test/mockApi'
import { renderApp } from '@/test/renderApp'

setupMockApi()
beforeEach(() => signIn())

async function open(path = '/') {
  const app = renderApp(path)
  await screen.findByRole('heading', { name: 'Overview' })
  await screen.findByRole('heading', { name: 'Progress by step' }, { timeout: 4000 })
  return app
}

const stats = (edition = 2026) => buildOverview(edition)

describe('Overview numbers', () => {
  it('shows the headline tiles for the newest edition', async () => {
    await open()
    const o = stats()
    expect(screen.getByText('Where the research stands for ADIPEC 2026.')).toBeInTheDocument()
    const discovered = screen.getByRole('link', { name: /Companies discovered/ })
    expect(discovered).toHaveTextContent(String(o.discovered))
    expect(screen.getByRole('link', { name: /Unique companies/ })).toHaveTextContent(
      String(o.unique),
    )
    expect(screen.getByRole('link', { name: /Possible duplicates/ })).toHaveTextContent(
      String(o.duplicates),
    )
    expect(screen.getByRole('link', { name: /^Contacts/ })).toHaveTextContent(String(o.contacts))
    expect(screen.getByRole('link', { name: /Companies with contacts/ })).toHaveTextContent(
      String(o.companiesWithContacts),
    )
    expect(screen.getByRole('link', { name: /AI drafts to review/ })).toHaveTextContent(
      String(o.ai.draft),
    )
    expect(screen.getByRole('link', { name: /Companies with a failure/ })).toHaveTextContent(
      String(o.failures),
    )
  })

  it('keeps the advertised number apart, labelled as reference only', async () => {
    await open()
    const o = stats()
    expect(o.advertised).toBe(2250)
    expect(o.discovered).not.toBe(o.advertised)
    // The advertised tile is not a link and says what it is
    expect(screen.getByText('ADIPEC advertised')).toBeInTheDocument()
    expect(screen.getByText('2,250')).toBeInTheDocument()
    expect(screen.getByText(/Reference only/)).toBeInTheDocument()
    // Nothing on the page works out a gap or a percentage against it
    expect(document.body.textContent).not.toMatch(/of 2,250|missing|shortfall/i)
  })

  it('switches edition and shows Not available when none was advertised', async () => {
    const { router } = await open()
    const user = userEvent.setup()
    await user.selectOptions(screen.getByLabelText('Edition'), '2025')
    await waitFor(() => expect(router.state.location.search).toBe('?edition=2025'))
    const o = stats(2025)
    await waitFor(() =>
      expect(screen.getByRole('link', { name: /Companies discovered/ })).toHaveTextContent(
        String(o.discovered),
      ),
    )
    expect(screen.getByText('Not available')).toBeInTheDocument()
    expect(screen.getByText('Where the research stands for ADIPEC 2025.')).toBeInTheDocument()
  })

  it('shows a friendly empty state for an edition with no companies', async () => {
    db.events.push({
      id: 'e_2027',
      edition: 2027,
      name: 'ADIPEC 2027',
      directoryUrl: 'https://x.example.com',
    })
    renderApp('/?edition=2027')
    expect(
      await screen.findByText('No companies discovered for this edition yet'),
    ).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Go to runs' })).toBeInTheDocument()
  })

  it('shows an error with a retry and recovers', async () => {
    window.history.replaceState({}, '', '/?mock_fail=/stats')
    renderApp('/')
    expect(await screen.findByRole('alert', {}, { timeout: 4000 })).toHaveTextContent(
      /could not load/i,
    )
    window.history.replaceState({}, '', '/')
    await userEvent.setup().click(screen.getByRole('button', { name: 'Try again' }))
    await screen.findByRole('heading', { name: 'Progress by step' }, { timeout: 4000 })
  })
})

describe('Progress by step chart', () => {
  it('has one bar per step, with a segment for every status that exists', async () => {
    await open()
    const o = stats()
    const list = screen.getByRole('list', { name: 'Progress per step' })
    for (const key of STEP_KEYS) {
      const counts = o.byStep[key]
      const group = within(list).getByRole('group', {
        name: {
          profile: 'ADIPEC profile',
          website: 'Website',
          social: 'Social profiles',
          account: 'Sales Nav account',
          people: 'Decision-makers',
          emails: 'Emails',
          verification: 'Email verification',
          personalization: 'Personalization',
        }[key],
      })
      const segments = within(group).getAllByRole('link')
      const present = Object.values(counts).filter((n) => (n ?? 0) > 0).length
      expect(segments).toHaveLength(present)
    }
  })

  it('sizes segments in proportion to their counts', async () => {
    await open()
    const o = stats()
    const failed = o.byStep.website.failed ?? 0
    expect(failed).toBeGreaterThan(0)
    const segment = screen.getByRole('link', { name: new RegExp(`^Website: Failed, ${failed} `) })
    expect(segment.style.flex).toMatch(new RegExp(`^${failed} 1 0`))
  })

  it('describes each segment in words and links to the matching company list', async () => {
    await open()
    const o = stats()
    const failed = o.byStep.website.failed ?? 0
    const segment = screen.getByRole('link', { name: new RegExp(`^Website: Failed, ${failed} `) })
    expect(segment).toHaveAttribute(
      'href',
      '/companies?edition=2026&step=website&stepStatus=failed',
    )
  })

  it('clicking a segment opens the company list with exactly those companies', async () => {
    const { router } = await open()
    const o = stats()
    const failed = o.byStep.website.failed ?? 0
    await userEvent
      .setup()
      .click(screen.getByRole('link', { name: new RegExp(`^Website: Failed, ${failed} `) }))
    await screen.findByRole('heading', { name: 'Companies' })
    expect(router.state.location.pathname).toBe('/companies')
    expect(router.state.location.search).toBe('?edition=2026&step=website&stepStatus=failed')
    await waitFor(
      () =>
        expect(
          screen.getByText(`${failed} matching ${failed === 1 ? 'company' : 'companies'}`),
        ).toBeInTheDocument(),
      { timeout: 4000 },
    )
  })

  it('has a legend with a text label for every status shown', async () => {
    await open()
    const legend = screen.getByRole('list', { name: 'Status colours' })
    for (const label of ['Completed', 'Failed', 'Not started', 'Pending access']) {
      expect(within(legend).getByText(label)).toBeInTheDocument()
    }
  })

  it('can be read as a table, with the same numbers', async () => {
    const { router } = await open()
    const o = stats()
    await userEvent.setup().click(screen.getByRole('button', { name: 'Table' }))
    await waitFor(() => expect(router.state.location.search).toBe('?view=table'))
    const table = await screen.findByRole('table', { name: 'Companies per step and status' })
    expect(within(table).getAllByRole('row')).toHaveLength(STEP_KEYS.length + 1)
    const websiteRow = within(table).getByRole('row', { name: /^Website/ })
    const failedColumn = within(table)
      .getAllByRole('columnheader')
      .findIndex((h) => h.textContent === 'Failed')
    expect(within(websiteRow).getAllByRole('cell')[failedColumn - 1]).toHaveTextContent(
      String(o.byStep.website.failed ?? 0),
    )
    expect(screen.queryByRole('list', { name: 'Progress per step' })).not.toBeInTheDocument()
  })
})

describe('Emails by status', () => {
  it('shows the total and one linked part per status that exists', async () => {
    await open()
    const o = stats()
    const total = Object.values(o.emailsByStatus).reduce((a, b) => a + b, 0)
    expect(screen.getByText(`${total} email addresses in total.`)).toBeInTheDocument()
    const group = screen.getByRole('group', { name: 'Emails by status' })
    const present = Object.values(o.emailsByStatus).filter((n) => n > 0).length
    expect(within(group).getAllByRole('link')).toHaveLength(present)
    const notChecked = within(group).getByRole('link', { name: /^Not checked:/ })
    expect(notChecked).toHaveAttribute('href', '/companies?edition=2026&emailStatus=not_checked')
  })

  it('says plainly that Not checked is not verified', async () => {
    await open()
    expect(screen.getByText(/It is not a verified address/)).toBeInTheDocument()
  })

  it('prints a share inside large parts only', async () => {
    await open()
    const group = screen.getByRole('group', { name: 'Emails by status' })
    for (const link of within(group).getAllByRole('link')) {
      const printed = link.textContent ?? ''
      const percent = Number(/\((\d+)%\)/.exec(link.getAttribute('aria-label') ?? '')?.[1])
      if (printed) expect(printed).toBe(`${percent}%`)
      if (percent < 15) expect(printed).toBe('')
    }
  })

  it('has a table view too', async () => {
    await open()
    await userEvent.setup().click(screen.getByRole('button', { name: 'Table' }))
    const table = await screen.findByRole('table', { name: 'Email addresses by status' })
    expect(within(table).getByRole('row', { name: /^Not checked/ })).toBeInTheDocument()
  })
})

describe('Tiles link to the filtered company list', () => {
  it('uses the chosen edition in every link', async () => {
    await open('/?edition=2025')
    await screen.findByRole('link', { name: /Companies discovered/ })
    for (const [name, query] of [
      [/Companies discovered/, '?edition=2025'],
      [/Possible duplicates/, '&duplicate=true'],
      [/AI drafts to review/, '&aiStatus=draft'],
      [/Companies with a failure/, '&stepStatus=failed'],
    ] as const) {
      expect(screen.getByRole('link', { name })).toHaveAttribute(
        'href',
        expect.stringContaining(query),
      )
    }
  })
})
