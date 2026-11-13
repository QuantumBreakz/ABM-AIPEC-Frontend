import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { api } from '@/api/client'
import type { ReviewType } from '@/api/types'
import { REVIEW_TYPES } from '@/api/types'
import { REVIEW_LABEL } from '@/lib/review'
import { db } from '@/mocks/db'
import { reviewItems } from '@/mocks/handlers/review'
import { setupMockApi, signIn } from '@/test/mockApi'
import { renderApp } from '@/test/renderApp'

setupMockApi()
beforeEach(() => signIn())

const items = (type: ReviewType) => reviewItems(type)
const company = (id: string) => db.companies.find((c) => c.id === id)
const tabName = (type: ReviewType) => new RegExp(`^${REVIEW_LABEL[type]} \\d+$`)

async function open(path: string) {
  const app = renderApp(path)
  await screen.findByRole('heading', { name: 'Review queue' }, { timeout: 4000 })
  await waitFor(
    () => {
      const rows = screen.queryAllByRole('row', { name: /^Review / })
      const empty = screen.queryByText('Nothing to review here')
      expect(rows.length > 0 || empty).toBeTruthy()
    },
    { timeout: 5000 },
  )
  return app
}

type Item = ReturnType<typeof items>[number]
/** The label a row has: the company, plus the contact for items about one person. */
const labelOf = (item: Item) =>
  `Review ${item.companyName}${item.contactName ? `, ${item.contactName}` : ''}`
const rowFor = (item: Item) => screen.getByRole('row', { name: labelOf(item) })

async function openRow(item: Item) {
  await userEvent.setup().click(rowFor(item))
  return screen.findByRole('dialog')
}

describe('Tabs and lists', () => {
  it('has a tab per kind of review, each with how many items wait', async () => {
    await open('/review/website')
    const nav = screen.getByRole('navigation', { name: 'Review queues' })
    for (const type of REVIEW_TYPES) {
      const link = within(nav).getByRole('link', { name: tabName(type) })
      expect(link).toHaveAttribute('href', `/review/${type}`)
      expect(link).toHaveTextContent(String(items(type).length))
    }
    expect(within(nav).getByRole('link', { name: tabName('website') })).toHaveAttribute(
      'aria-current',
      'page',
    )
  })

  it('sends /review to the first tab', async () => {
    const { router } = await open('/review')
    expect(router.state.location.pathname).toBe('/review/website')
  })

  it('lists each item with why it is here and how long it has waited', async () => {
    await open('/review/website')
    const expected = items('website')
    const rows = screen.getAllByRole('row', { name: /^Review / })
    expect(rows).toHaveLength(Math.min(50, expected.length))
    const first = expected[0]
    const row = rowFor(first as Item)
    expect(row).toHaveTextContent(first?.reason as string)
    expect(within(row).getByRole('link', { name: first?.companyName })).toHaveAttribute(
      'href',
      `/companies/${first?.companyId}`,
    )
    // a relative time such as "3 days ago", not a blank
    expect(within(row).getByText(/ago|just now|yesterday/)).toBeInTheDocument()
  })

  it('shows the contact on rows that are about one person', async () => {
    await open('/review/emails')
    const first = items('emails')[0]
    expect(first?.contactName).toBeTruthy()
    expect(screen.getAllByText(first?.contactName as string).length).toBeGreaterThan(0)
  })

  it('shows a friendly empty state when a queue is clear', async () => {
    for (const c of db.companies) c.duplicateOf = undefined
    await open('/review/duplicate')
    expect(await screen.findByText('Nothing to review here')).toBeInTheDocument()
  })

  it('shows a 404 for an unknown queue', async () => {
    renderApp('/review/nope')
    expect(
      await screen.findByText('We could not find that page', {}, { timeout: 4000 }),
    ).toBeInTheDocument()
  })

  it('shows an error with a retry and recovers', async () => {
    window.history.replaceState({}, '', '/?mock_fail=/review')
    renderApp('/review/website')
    expect(await screen.findByRole('alert', {}, { timeout: 4000 })).toHaveTextContent(
      /could not load/i,
    )
    window.history.replaceState({}, '', '/')
    await userEvent.setup().click(screen.getByRole('button', { name: 'Try again' }))
    await waitFor(
      () => expect(screen.getAllByRole('row', { name: /^Review / }).length).toBeGreaterThan(0),
      { timeout: 5000 },
    )
  })
})

describe('The item drawer', () => {
  it('opens when a row is clicked, and the address says which item', async () => {
    const { router } = await open('/review/website')
    const first = items('website')[0]
    const dialog = await openRow(first as Item)
    expect(within(dialog).getByText(first?.companyName as string)).toBeInTheDocument()
    expect(router.state.location.search).toContain(`item=${first?.companyId}`)
    expect(
      within(dialog).getByRole('link', { name: 'Open the full company page' }),
    ).toHaveAttribute('href', `/companies/${first?.companyId}`)
  })

  it('opens straight from a shared link, and closes by removing the item from the address', async () => {
    const id = items('website')[0]?.companyId as string
    const { router } = renderApp(`/review/website?item=${id}`)
    const dialog = await screen.findByRole('dialog', {}, { timeout: 4000 })
    await waitFor(() => expect(dialog).toHaveTextContent(company(id)?.name as string))
    await userEvent.setup().click(within(dialog).getByRole('button', { name: 'Close panel' }))
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    expect(router.state.location.search).not.toContain('item=')
  })

  it('points other kinds of review at the right company tab', async () => {
    await open('/review/salesnav')
    const first = items('salesnav')[0]
    const dialog = await openRow(first as Item)
    expect(within(dialog).getByRole('link', { name: 'Open the Contacts tab' })).toHaveAttribute(
      'href',
      `/companies/${first?.companyId}/contacts`,
    )
    expect(dialog).toHaveTextContent(first?.reason as string)
    expect(dialog).toHaveTextContent('FE-3.3')
  })

  it('points AI items at the AI tab', async () => {
    await open('/review/ai')
    const first = items('ai')[0]
    const dialog = await openRow(first as Item)
    expect(within(dialog).getByRole('link', { name: 'Open the AI tab' })).toHaveAttribute(
      'href',
      `/companies/${first?.companyId}/ai`,
    )
  })
})

describe('Fixing a website', () => {
  it('sets the address, removes the item from the list and lowers the counts', async () => {
    await open('/review/website')
    const before = items('website').length
    const target = items('website')[0]
    const dialog = await openRow(target as Item)
    const user = userEvent.setup()
    const field = within(dialog).getByLabelText('Website address')
    await user.clear(field)
    await user.type(field, 'https://right-site.example.com')
    await user.click(within(dialog).getByRole('button', { name: 'Save website' }))

    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    await waitFor(() =>
      expect(
        screen.queryByRole('row', { name: new RegExp(`^Review ${target?.companyName}`) }),
      ).not.toBeInTheDocument(),
    )
    await waitFor(() =>
      expect(
        within(screen.getByRole('navigation', { name: 'Review queues' })).getByRole('link', {
          name: tabName('website'),
        }),
      ).toHaveTextContent(String(before - 1)),
    )

    const c = company(target?.companyId as string)
    expect(c?.website.url).toBe('https://right-site.example.com')
    // honest about what is known: the address is set, the research is not done
    expect(c?.stages.website.status).toBe('partial')
    expect(items('website')).toHaveLength(before - 1)
  })

  it('explains a bad address and changes nothing', async () => {
    await open('/review/website')
    const target = items('website')[0]
    const original = company(target?.companyId as string)?.website.url
    const dialog = await openRow(target as Item)
    const user = userEvent.setup()
    const field = within(dialog).getByLabelText('Website address')
    await user.clear(field)
    await user.type(field, 'not a web address')
    await user.click(within(dialog).getByRole('button', { name: 'Save website' }))
    expect(
      await within(dialog).findByText(/full web address starting with http/i),
    ).toBeInTheDocument()
    expect(company(target?.companyId as string)?.website.url).toBe(original)
  })

  it('marks a company as having no website, but only with a reason', async () => {
    await open('/review/website')
    const before = items('website').length
    const target = items('website')[0]
    const dialog = await openRow(target as Item)
    const user = userEvent.setup()

    await user.click(within(dialog).getByRole('button', { name: 'Mark as no website' }))
    expect(await within(dialog).findByText(/Give a short reason/)).toBeInTheDocument()
    expect(items('website')).toHaveLength(before)

    await user.type(
      within(dialog).getByLabelText('Reason'),
      'A small local firm with only a LinkedIn page.',
    )
    await user.click(within(dialog).getByRole('button', { name: 'Mark as no website' }))
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    await waitFor(() => expect(items('website')).toHaveLength(before - 1))
    const step = company(target?.companyId as string)?.stages.website
    expect(step?.status).toBe('completed')
    expect(step?.reason).toBe('No website: A small local firm with only a LinkedIn page.')
  })

  it('shows what is known about the failed attempt', async () => {
    await open('/review/website')
    const target = items('website').find((i) => i.companyId === 'c_002')
    const dialog = await openRow(target as Item)
    const known = within(dialog).getByRole('region', { name: 'What we know' })
    expect(known).toHaveTextContent('Failed')
    expect(known).toHaveTextContent('Website did not respond (timed out after 30 s).')
    expect(known).toHaveTextContent('Site did not respond.')
  })
})

describe('Resolving duplicates', () => {
  const firstDuplicate = () => items('duplicate')[0] as ReturnType<typeof items>[number]

  it('compares the two records side by side', async () => {
    await open('/review/duplicate')
    const target = firstDuplicate()
    const mine = company(target.companyId)
    const other = company(mine?.duplicateOf as string)
    const dialog = await openRow(target)
    const table = await within(dialog).findByRole('table', { name: 'The two records side by side' })
    expect(table).toHaveTextContent(mine?.name as string)
    expect(table).toHaveTextContent(other?.name as string)
    expect(within(table).getByRole('link', { name: `Open ${other?.name}` })).toHaveAttribute(
      'href',
      `/companies/${other?.id}`,
    )
    for (const label of [
      'Name',
      'Website',
      'Country',
      'Category',
      'LinkedIn',
      'Contacts',
      'Research complete',
    ]) {
      expect(within(table).getByRole('rowheader', { name: label })).toBeInTheDocument()
    }
    // helps decide: marks fields as Same or Different when both records have a value
    expect(within(table).getAllByText(/^(Same|Different)$/).length).toBeGreaterThan(0)
  })

  it('marks a record as not a duplicate', async () => {
    await open('/review/duplicate')
    const before = items('duplicate').length
    const target = firstDuplicate()
    const dialog = await openRow(target)
    await userEvent
      .setup()
      .click(await within(dialog).findByRole('button', { name: 'Not a duplicate' }))
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    await waitFor(() => expect(items('duplicate')).toHaveLength(before - 1))
    expect(company(target.companyId)?.duplicateOf).toBeUndefined()
    await waitFor(() =>
      expect(
        screen.queryByRole('row', { name: new RegExp(`^Review ${target.companyName}`) }),
      ).not.toBeInTheDocument(),
    )
  })

  it('merges into the record it looks like, after asking for confirmation', async () => {
    await open('/review/duplicate')
    const before = items('duplicate').length
    const target = firstDuplicate()
    const mine = company(target.companyId)
    const otherId = mine?.duplicateOf as string
    const otherContacts = company(otherId)?.contacts.length as number
    const myContacts = mine?.contacts.length as number
    const dialog = await openRow(target)
    const user = userEvent.setup()
    await user.click(await within(dialog).findByRole('button', { name: 'Merge into…' }))

    const confirm = await screen.findByRole('dialog', { name: 'Merge these two records?' })
    expect(confirm).toHaveTextContent(
      `Contacts, editions and names move to ${company(otherId)?.name}`,
    )
    expect(confirm).toHaveTextContent('cannot be undone')
    // nothing happens until it is confirmed
    expect(company(target.companyId)).toBeTruthy()

    await user.click(within(confirm).getByRole('button', { name: 'Merge' }))
    await waitFor(() => expect(company(target.companyId)).toBeUndefined())
    expect(company(otherId)?.contacts.length).toBeGreaterThanOrEqual(otherContacts)
    expect(company(otherId)?.contacts.length).toBeLessThanOrEqual(otherContacts + myContacts)
    await waitFor(() => expect(items('duplicate')).toHaveLength(before - 1))
    await waitFor(() =>
      expect(
        screen.queryByRole('row', { name: new RegExp(`^Review ${target.companyName}`) }),
      ).not.toBeInTheDocument(),
    )
  })

  it('can keep this record instead, and never leaves it pointing at itself', async () => {
    await open('/review/duplicate')
    const target = firstDuplicate()
    const mine = company(target.companyId)
    const otherId = mine?.duplicateOf as string
    const dialog = await openRow(target)
    const user = userEvent.setup()
    await user.click(await within(dialog).findByRole('button', { name: 'Merge into…' }))
    const confirm = await screen.findByRole('dialog', { name: 'Merge these two records?' })
    await user.selectOptions(within(confirm).getByLabelText('Keep'), 'mine')
    expect(confirm).toHaveTextContent(`move to ${mine?.name}`)
    await user.click(within(confirm).getByRole('button', { name: 'Merge' }))
    await waitFor(() => expect(company(otherId)).toBeUndefined())
    expect(company(target.companyId)).toBeTruthy()
    expect(company(target.companyId)?.duplicateOf).toBeUndefined()
  })

  it('lets a reviewer resolve items too', async () => {
    await api.post('/auth/logout')
    window.history.replaceState({}, '', '/?mock_role=reviewer')
    await open('/review/duplicate')
    const target = firstDuplicate()
    const dialog = await openRow(target)
    await userEvent
      .setup()
      .click(await within(dialog).findByRole('button', { name: 'Not a duplicate' }))
    await waitFor(() => expect(company(target.companyId)?.duplicateOf).toBeUndefined())
  })
})

describe('The sidebar badge', () => {
  it('goes down when an item is resolved', async () => {
    await open('/review/duplicate')
    const badge = () =>
      Number(
        /(\d+) waiting/.exec(
          screen.getByLabelText(/\d+ waiting/).getAttribute('aria-label') ?? '',
        )?.[1],
      )
    const before = badge()
    const target = items('duplicate')[0] as ReturnType<typeof items>[number]
    const dialog = await openRow(target)
    await userEvent
      .setup()
      .click(await within(dialog).findByRole('button', { name: 'Not a duplicate' }))
    await waitFor(() => expect(badge()).toBe(before - 1))
  })
})
