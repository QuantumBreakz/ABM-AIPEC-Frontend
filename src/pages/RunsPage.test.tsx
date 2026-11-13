import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { api } from '@/api/client'
import { polling } from '@/api/queries/runs'
import { db } from '@/mocks/db'
import { setupMockApi, signIn } from '@/test/mockApi'
import { renderApp } from '@/test/renderApp'

setupMockApi()
beforeEach(async () => {
  polling.runsMs = 60_000 // no surprise polling unless a test asks for it
  await signIn()
})
afterAll(() => {
  polling.runsMs = 5_000
})

async function openRuns(path = '/runs') {
  const app = renderApp(path)
  await screen.findByRole('heading', { name: 'Runs' })
  await screen.findByRole('row', { name: 'Open run r_4' }, { timeout: 4000 })
  return app
}

async function openDetail(id: string) {
  const app = renderApp(`/runs/${id}`)
  await screen.findByRole('heading', { name: `Run ${id}` }, { timeout: 4000 })
  return app
}

describe('Runs list', () => {
  it('shows every run with its status and progress', async () => {
    await openRuns()
    for (const [id, status] of [
      ['r_4', 'Running'],
      ['r_3', 'Paused'],
      ['r_2', 'Completed'],
      ['r_1', 'Failed'],
    ] as const) {
      const row = screen.getByRole('row', { name: `Open run ${id}` })
      expect(within(row).getByText(status)).toBeInTheDocument()
      expect(within(row).getByRole('progressbar', { name: 'Run progress' })).toBeInTheDocument()
    }
    // a finished run reads 100%
    expect(
      within(screen.getByRole('row', { name: 'Open run r_2' })).getByRole('progressbar'),
    ).toHaveAttribute('aria-valuenow', '100')
    expect(screen.getByText(/A run is in progress/)).toBeInTheDocument()
  })

  it('lets an admin start a run, but hides the button from a reviewer', async () => {
    const admin = await openRuns()
    expect(screen.getAllByRole('button', { name: 'Start run' }).length).toBeGreaterThan(0)
    admin.unmount()

    await api.post('/auth/logout')
    window.history.replaceState({}, '', '/?mock_role=reviewer')
    await openRuns()
    expect(screen.queryByRole('button', { name: 'Start run' })).not.toBeInTheDocument()
  })

  it('opens a run when its row is clicked', async () => {
    const { router } = await openRuns()
    await userEvent.setup().click(screen.getByRole('row', { name: 'Open run r_2' }))
    await screen.findByRole('heading', { name: 'Run r_2' })
    expect(router.state.location.pathname).toBe('/runs/r_2')
  })

  it('shows a friendly empty state when there are no runs', async () => {
    db.runs.splice(0, db.runs.length)
    renderApp('/runs')
    expect(await screen.findByText('No runs yet', {}, { timeout: 4000 })).toBeInTheDocument()
    expect(screen.getAllByRole('button', { name: 'Start run' }).length).toBeGreaterThan(0)
  })

  it('shows an error with a retry and recovers', async () => {
    window.history.replaceState({}, '', '/?mock_fail=/runs')
    renderApp('/runs')
    expect(await screen.findByRole('alert', {}, { timeout: 4000 })).toHaveTextContent(
      /could not load/i,
    )
    window.history.replaceState({}, '', '/')
    await userEvent.setup().click(screen.getByRole('button', { name: 'Try again' }))
    await screen.findByRole('row', { name: 'Open run r_4' }, { timeout: 4000 })
  })
})

describe('Start run dialog', () => {
  async function openDialog() {
    await openRuns()
    const user = userEvent.setup()
    await user.click(screen.getAllByRole('button', { name: 'Start run' })[0] as HTMLElement)
    const dialog = await screen.findByRole('dialog', { name: 'Start a run' })
    await within(dialog).findByLabelText('Edition')
    return { user, dialog }
  }

  it('starts with the newest edition and every step ticked', async () => {
    const { dialog } = await openDialog()
    expect((within(dialog).getByLabelText('Edition') as HTMLSelectElement).value).toBe('2026')
    const boxes = within(dialog).getAllByRole('checkbox') as HTMLInputElement[]
    expect(boxes).toHaveLength(9)
    expect(boxes.every((b) => b.checked)).toBe(true)
    expect(within(dialog).getByText(/9 of 9 steps selected/)).toBeInTheDocument()
    expect(
      within(dialog).getByRole('checkbox', { name: 'Exhibitor directory' }),
    ).toBeInTheDocument()
  })

  it('refuses to start with no steps ticked', async () => {
    const { user, dialog } = await openDialog()
    await user.click(within(dialog).getByRole('button', { name: 'Select none' }))
    expect(within(dialog).getByText(/0 of 9 steps selected/)).toBeInTheDocument()
    await user.click(within(dialog).getByRole('button', { name: 'Start run' }))
    expect(await within(dialog).findByText('Pick at least one step.')).toBeInTheDocument()
    await user.click(within(dialog).getByRole('button', { name: 'Select all' }))
    expect(within(dialog).getByText(/9 of 9 steps selected/)).toBeInTheDocument()
  })

  it('explains clearly when another run is already in progress (409)', async () => {
    const { user, dialog } = await openDialog()
    await user.click(within(dialog).getByRole('button', { name: 'Start run' }))
    const alert = await within(dialog).findByRole('alert')
    expect(alert).toHaveTextContent(/A run is already in progress/)
    // and points at it
    expect(
      within(alert).getByRole('link', { name: /Open the run in progress \(r_4\)/ }),
    ).toHaveAttribute('href', '/runs/r_4')
    // the dialog stays open so nothing is lost
    expect(screen.getByRole('dialog', { name: 'Start a run' })).toBeInTheDocument()
  })

  it('starts a run, goes to it, and shows it running (after the other is paused)', async () => {
    await api.post('/runs/r_4/pause')
    const { user, dialog } = await openDialog()
    await user.click(within(dialog).getByRole('button', { name: 'Start run' }))
    const heading = await screen.findByRole('heading', { name: /^Run r_10/ }, { timeout: 4000 })
    expect(heading).toBeInTheDocument()
    expect(screen.getAllByText('Running').length).toBeGreaterThan(0)
    // all nine steps were queued
    const steps = screen.getByRole('list', { name: 'Progress per step' })
    expect(within(steps).getAllByRole('listitem')).toHaveLength(9)
  })

  it('runs only the steps you leave ticked', async () => {
    await api.post('/runs/r_4/pause')
    const { user, dialog } = await openDialog()
    await user.click(within(dialog).getByRole('checkbox', { name: 'Emails' }))
    await user.click(within(dialog).getByRole('checkbox', { name: 'Email verification' }))
    expect(within(dialog).getByText(/7 of 9 steps selected/)).toBeInTheDocument()
    await user.click(within(dialog).getByRole('button', { name: 'Start run' }))
    await screen.findByRole('heading', { name: /^Run r_10/ }, { timeout: 4000 })
    const steps = screen.getByRole('list', { name: 'Progress per step' })
    expect(within(steps).getAllByRole('listitem')).toHaveLength(7)
    expect(within(steps).queryByText('Emails')).not.toBeInTheDocument()
  })
})

describe('Run detail', () => {
  it('shows status, counts, per-step progress and errors', async () => {
    await openDetail('r_4')
    expect(screen.getAllByText('Running').length).toBeGreaterThan(0)
    expect(screen.getByText('Updating every 5 seconds')).toBeInTheDocument()
    expect(screen.getByRole('progressbar', { name: 'Run progress' })).toBeInTheDocument()
    for (const label of [
      'Discovered',
      'Attempted',
      'Completed',
      'Partial',
      'Restricted',
      'Failed',
      'Duplicates',
    ]) {
      expect(screen.getByText(label, { selector: 'p' })).toBeInTheDocument()
    }
    const steps = screen.getByRole('list', { name: 'Progress per step' })
    expect(within(steps).getAllByRole('listitem')).toHaveLength(9)
    expect(within(steps).getByText('Exhibitor directory')).toBeInTheDocument()
    // numbers are printed, not only drawn
    expect(within(steps).getAllByText(/waiting/).length).toBe(9)
  })

  it('lists errors and links each one to its company', async () => {
    await openDetail('r_4')
    const table = await screen.findByRole('table', { name: 'Errors recorded by this run' })
    const link = within(table).getByRole('link', { name: db.companies[1]?.name as string })
    expect(link).toHaveAttribute('href', '/companies/c_002')
  })

  it('shows a failed run with its errors', async () => {
    await openDetail('r_1')
    expect(screen.getAllByText('Failed').length).toBeGreaterThan(0)
    expect(screen.queryByRole('button', { name: /pause run|resume run/i })).not.toBeInTheDocument()
  })

  it('pauses and resumes', async () => {
    await openDetail('r_4')
    const user = userEvent.setup()
    await user.click(screen.getByRole('button', { name: 'Pause run' }))
    await screen.findByRole('button', { name: 'Resume run' })
    expect(screen.getAllByText('Paused').length).toBeGreaterThan(0)
    expect(screen.getByText(/This page stops updating/)).toBeInTheDocument()
    expect(screen.queryByText('Updating every 5 seconds')).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Resume run' }))
    await screen.findByRole('button', { name: 'Pause run' })
    expect(screen.getAllByText('Running').length).toBeGreaterThan(0)
  })

  it('explains why a run cannot resume while another one is running', async () => {
    await openDetail('r_3') // paused
    await userEvent.setup().click(await screen.findByRole('button', { name: 'Resume run' }))
    const alert = await screen.findByRole('alert')
    expect(alert).toHaveTextContent(/already in progress/i)
    // the run is still paused
    expect(screen.getByRole('button', { name: 'Resume run' })).toBeInTheDocument()
  })

  it('keeps updating while running and stops once it has finished', async () => {
    polling.runsMs = 40
    await openDetail('r_4')
    // Look only inside the summary: a count tile is also labelled "Completed".
    const summary = screen.getByRole('region', { name: 'Run summary' })
    await waitFor(() => expect(within(summary).getByText('Completed')).toBeInTheDocument(), {
      timeout: 6000,
    })
    expect(screen.getByRole('progressbar', { name: 'Run progress' })).toHaveAttribute(
      'aria-valuenow',
      '100',
    )
    expect(screen.queryByText('Updating every 5 seconds')).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Pause run' })).not.toBeInTheDocument()
  })

  it('hides pause and resume from a reviewer', async () => {
    await api.post('/auth/logout')
    window.history.replaceState({}, '', '/?mock_role=reviewer')
    await openDetail('r_4')
    expect(screen.queryByRole('button', { name: /pause run|resume run/i })).not.toBeInTheDocument()
  })

  it('shows a not-found state for an unknown run, with a way back', async () => {
    renderApp('/runs/nope')
    expect(await screen.findByRole('alert', {}, { timeout: 4000 })).toHaveTextContent(
      /could not find/i,
    )
    expect(screen.getByRole('link', { name: /all runs/i })).toHaveAttribute('href', '/runs')
  })
})
