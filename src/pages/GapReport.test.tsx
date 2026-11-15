import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { api } from '@/api/client'
import { db } from '@/mocks/db'
import type { GapReport, Overview } from '@/api/types'
import { STEP_KEYS } from '@/api/types'
import { STEP_LABEL } from '@/lib/status'
import { setupMockApi, signIn } from '@/test/mockApi'
import { renderApp } from '@/test/renderApp'

setupMockApi()
beforeEach(() => signIn())

const saved: Blob[] = []
beforeEach(() => {
  saved.length = 0
  URL.createObjectURL = (blob: Blob | MediaSource) => {
    saved.push(blob as Blob)
    return 'blob:test'
  }
  URL.revokeObjectURL = () => {}
  HTMLAnchorElement.prototype.click = function click() {}
})

async function open(search = '') {
  const app = renderApp(`/admin/gap-report${search}`)
  await screen.findByRole('heading', { level: 1, name: 'Gap report' }, { timeout: 4000 })
  return { ...app, user: userEvent.setup() }
}

/** The whole tile (label, number, hint) that carries this label. */
const tile = (name: string) =>
  screen.findByText(name).then((el) => el.closest('.h-full') as HTMLElement)

describe('Gap report', () => {
  it('shows the same numbers as the overview for the same edition', async () => {
    const edition = 2026
    const [gap, overview] = await Promise.all([
      api.get<GapReport>('/reports/gap', { edition }),
      api.get<Overview>('/stats/overview', { edition }),
    ])
    await open(`?edition=${edition}`)

    expect(gap.discovered).toBe(overview.discovered)
    expect(gap.contactsFound).toBe(overview.contacts)
    expect(gap.byStep).toEqual(overview.byStep)
    const checked = Object.entries(overview.emailsByStatus)
      .filter(([status]) => status !== 'not_checked')
      .reduce((sum, [, n]) => sum + n, 0)
    expect(gap.emailsChecked).toBe(checked)
    expect(gap.aiDone).toBe(overview.ai.draft + overview.ai.approved)

    const discovered = await tile('Companies discovered')
    expect(discovered).toHaveTextContent(new RegExp(String(overview.discovered)))
  })

  it('has a per-step status table with every step', async () => {
    await open('?edition=2026')
    const table = await screen.findByRole('table', { name: 'Companies per step and status' })
    for (const key of STEP_KEYS) {
      expect(within(table).getByRole('rowheader', { name: STEP_LABEL[key] })).toBeInTheDocument()
    }
  })

  it('lists each blocked record with its step, status, reason and a link to the company', async () => {
    const gap = await api.get<GapReport>('/reports/gap', { edition: 2026 })
    const first = gap.blocked[0] as GapReport['blocked'][number]
    expect(first).toBeDefined()
    await open('?edition=2026')
    const links = await screen.findAllByRole('link', { name: first.companyName })
    const row = links[0]?.closest('tr') as HTMLElement
    expect(links[0]).toHaveAttribute('href', `/companies/${first.companyId}`)
    expect(row).toHaveTextContent(STEP_LABEL[first.step])
    expect(row).toHaveTextContent(first.reason ?? 'No reason recorded')
  })

  it('says so, instead of leaving a blank, when a blocked step has no recorded reason', async () => {
    const first = (await api.get<GapReport>('/reports/gap', { edition: 2026 })).blocked[0]
    const company = db.companies.find((c) => c.id === first?.companyId)
    if (!first || !company) throw new Error('the sample data has no blocked record')
    company.stages[first.step].reason = undefined
    await open('?edition=2026')
    const link = (await screen.findAllByRole('link', { name: first.companyName }))[0]
    expect(link?.closest('tr')).toHaveTextContent('No reason recorded')
  })

  it('downloads the blocked records as a CSV Excel can read', async () => {
    const { user } = await open('?edition=2026')
    await user.click(await screen.findByRole('button', { name: 'Download CSV' }))
    await waitFor(() => expect(saved).toHaveLength(1))
    const blob = saved[0] as Blob
    expect(blob.type).toContain('text/csv')
    const bytes =
      typeof blob.arrayBuffer === 'function'
        ? new Uint8Array(await blob.arrayBuffer())
        : await new Promise<Uint8Array>((resolve, reject) => {
            const reader = new FileReader()
            reader.onload = () => resolve(new Uint8Array(reader.result as ArrayBuffer))
            reader.onerror = () => reject(reader.error)
            reader.readAsArrayBuffer(blob)
          })
    expect([...bytes.slice(0, 3)]).toEqual([0xef, 0xbb, 0xbf])
  })

  it('switching the edition changes the numbers', async () => {
    const { user } = await open('?edition=2026')
    const a = await api.get<GapReport>('/reports/gap', { edition: 2026 })
    const b = await api.get<GapReport>('/reports/gap', { edition: 2025 })
    await user.selectOptions(await screen.findByLabelText('Edition'), '2025')
    await waitFor(async () =>
      expect(await tile('Companies discovered')).toHaveTextContent(String(b.discovered)),
    )
    expect(a.discovered).not.toBe(b.discovered)
  })

  it('is open to a reviewer', async () => {
    await api.post('/auth/logout')
    await signIn('reviewer@example.com')
    await open('?edition=2026')
    expect(await screen.findByRole('button', { name: 'Download CSV' })).toBeInTheDocument()
  })
})
