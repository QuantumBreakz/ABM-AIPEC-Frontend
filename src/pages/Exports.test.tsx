import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { api } from '@/api/client'
import type { CompanyListItem, Paged } from '@/api/types'
import { db } from '@/mocks/db'
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

/** Read a Blob's bytes (the test browser's Blob cannot be passed to Response). */
function readBytes(blob: Blob) {
  return new Promise<Uint8Array>((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(new Uint8Array(reader.result as ArrayBuffer))
    reader.onerror = () => reject(reader.error)
    reader.readAsArrayBuffer(blob)
  })
}

async function open(search = '') {
  const app = renderApp(`/exports${search}`)
  await screen.findByRole('heading', { level: 1, name: 'Exports' }, { timeout: 4000 })
  return { ...app, user: userEvent.setup() }
}

const countText = async () => (await screen.findByRole('status')).textContent ?? ''
const rowsShown = async (re = /([\d,]+)\s+rows?/) => {
  let value = 0
  await waitFor(
    async () => {
      const match = re.exec(await countText())
      expect(match).not.toBeNull()
      value = Number((match as RegExpExecArray)[1]?.replaceAll(',', ''))
    },
    { timeout: 5000 },
  )
  return value
}

describe('Exports page', () => {
  it('starts on the outreach file, initial version, and explains each choice', async () => {
    await open()
    expect(screen.getByRole('radio', { name: /Outreach/ })).toBeChecked()
    expect(screen.getByRole('radio', { name: /Initial/ })).toBeChecked()
    expect(screen.getByText(/never marked Verified/)).toBeInTheDocument()
    expect(screen.getByText(/After the email check/)).toBeInTheDocument()
  })

  it('keeps the type and version in the address so the page can be shared', async () => {
    const { user, router } = await open()
    await user.click(screen.getByRole('radio', { name: /Final/ }))
    await user.click(screen.getByRole('radio', { name: /Contacts/ }))
    expect(router.state.location.search).toContain('kind=contacts')
    expect(router.state.location.search).toContain('version=final')
  })

  it('shows a live row count that matches the company list for the same filters', async () => {
    const country = db.companies.find((c) => c.country)?.country as string
    await open(`?kind=companies&country=${encodeURIComponent(country)}`)
    const shown = await rowsShown()
    const list = await api.get<Paged<CompanyListItem>>('/companies', {
      country,
      pageSize: 200,
    })
    expect(shown).toBe(list.total)
    expect(shown).toBeGreaterThan(0)
  })

  it('updates the count when the type changes', async () => {
    const { user } = await open('?kind=companies')
    const companies = await rowsShown()
    await user.click(screen.getByRole('radio', { name: /Contacts/ }))
    await waitFor(async () => expect(await rowsShown()).not.toBe(companies), { timeout: 5000 })
  })

  it('turns the download off and says why when no rows match', async () => {
    await open('?kind=companies&q=zzzz-no-such-company')
    await waitFor(async () => expect(await countText()).toMatch(/No rows match/), {
      timeout: 5000,
    })
    expect(screen.getByRole('button', { name: 'Download CSV' })).toBeDisabled()
  })

  it('downloads a CSV that opens in Excel with correct characters, and logs it', async () => {
    const { user } = await open('?kind=contacts&version=initial')
    await rowsShown()
    const before = db.exportLog.length
    await user.click(screen.getByRole('button', { name: 'Download CSV' }))
    await waitFor(() => expect(saved).toHaveLength(1))
    const blob = saved[0] as Blob
    expect(blob.type).toContain('text/csv')
    const bytes = await readBytes(blob)
    // the first three bytes are the UTF-8 byte order mark, so Excel reads the characters correctly
    expect([...bytes.slice(0, 3)]).toEqual([0xef, 0xbb, 0xbf])
    expect(new TextDecoder().decode(bytes)).toContain('\r\n')
    await waitFor(() => expect(db.exportLog).toHaveLength(before + 1))
    expect(db.exportLog[0]?.kind).toBe('contacts')
    expect(db.exportLog[0]?.version).toBe('initial')
  })

  it('shows past exports in the history with their filters', async () => {
    db.exportLog.unshift({
      id: 'x_test',
      kind: 'companies',
      version: 'final',
      filters: { country: 'Qatar', hasContacts: true },
      rows: 12,
      by: 'admin@example.com',
      at: new Date().toISOString(),
    })
    await open()
    const history = await screen.findByRole('region', { name: 'Export history' })
    const row = (await within(history).findByText('Country: Qatar · Has contacts')).closest(
      'tr',
    ) as HTMLElement
    expect(row).toHaveTextContent('Companies')
    expect(row).toHaveTextContent('Final')
    expect(row).toHaveTextContent('Country: Qatar · Has contacts')
  })

  it('shows an empty history before anything was exported', async () => {
    db.exportLog.length = 0
    await open()
    expect(await screen.findByText('Nothing exported yet')).toBeInTheDocument()
  })
})
