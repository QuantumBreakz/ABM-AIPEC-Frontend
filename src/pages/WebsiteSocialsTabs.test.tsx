import { screen, within } from '@testing-library/react'
import { db } from '@/mocks/db'
import { setupMockApi, signIn } from '@/test/mockApi'
import { renderApp } from '@/test/renderApp'

setupMockApi()
beforeEach(() => signIn())

const company = (id: string) => db.companies.find((c) => c.id === id)

async function open(path: string, id: string) {
  const app = renderApp(path)
  await screen.findByRole('heading', { level: 1, name: company(id)?.name }, { timeout: 4000 })
  return app
}

const href = (url: string | undefined) => new URL(url as string).href
const region = (name: string) => screen.getByRole('region', { name })
/** The value shown next to a label inside a card. */
const valueOf = (card: HTMLElement, label: string) =>
  within(card).getByText(label, { selector: 'dt' }).nextElementSibling as HTMLElement

describe('Website tab', () => {
  it('shows the summary, website, services and markets', async () => {
    const c = company('c_001')
    await open('/companies/c_001/website', 'c_001')
    const card = region('About the company')
    expect(valueOf(card, 'Summary')).toHaveTextContent(c?.website.summary as string)
    expect(within(valueOf(card, 'Website')).getByRole('link')).toHaveAttribute(
      'href',
      href(c?.website.url),
    )
    const services = within(valueOf(card, 'Services')).getAllByRole('listitem')
    expect(services.map((s) => s.textContent)).toEqual(c?.website.services)
    const markets = within(valueOf(card, 'Markets')).getAllByRole('listitem')
    expect(markets.map((s) => s.textContent)).toEqual(c?.website.markets)
  })

  it('shows contact details together with where they were found', async () => {
    const c = company('c_001')
    await open('/companies/c_001/website', 'c_001')
    const card = region('Contact details')
    expect(valueOf(card, 'Emails')).toHaveTextContent(c?.website.contactDetails.emails[0] as string)
    expect(valueOf(card, 'Phones')).toHaveTextContent(c?.website.contactDetails.phones[0] as string)
    expect(valueOf(card, 'Addresses')).toHaveTextContent(
      c?.website.contactDetails.addresses[0] as string,
    )
    expect(within(valueOf(card, 'Found on')).getByRole('link')).toHaveAttribute(
      'href',
      href(c?.website.contactDetails.sourceUrl),
    )
  })

  it('flags contact details that have no source instead of presenting them as sourced', async () => {
    const c = company('c_001')
    if (c) c.website.contactDetails.sourceUrl = undefined
    await open('/companies/c_001/website', 'c_001')
    expect(valueOf(region('Contact details'), 'Found on')).toHaveTextContent(
      'No source was recorded',
    )
  })

  it('links every fact to its source and labels guesses as inferences (AT-03)', async () => {
    const c = company('c_001')
    await open('/companies/c_001/website', 'c_001')
    const list = screen.getByRole('list', { name: 'Facts and inferences' })
    const items = within(list).getAllByRole('listitem')
    expect(items).toHaveLength(c?.website.facts.length as number)
    for (const fact of c?.website.facts ?? []) {
      const item = items.find((li) => li.textContent?.includes(fact.text)) as HTMLElement
      expect(item, fact.text).toBeTruthy()
      expect(within(item).getByRole('link')).toHaveAttribute('href', href(fact.sourceUrl))
      expect(
        within(item).getByText(fact.kind === 'inference' ? 'Inference' : 'Fact'),
      ).toBeInTheDocument()
    }
    expect(within(list).getAllByText('Inference')).toHaveLength(
      c?.website.facts.filter((f) => f.kind === 'inference').length as number,
    )
  })

  it('never turns a bad source address into a link', async () => {
    const c = company('c_001')
    if (c?.website.facts[0]) c.website.facts[0].sourceUrl = 'javascript:alert(1)'
    await open('/companies/c_001/website', 'c_001')
    const first = within(screen.getByRole('list', { name: 'Facts and inferences' })).getAllByRole(
      'listitem',
    )[0] as HTMLElement
    expect(within(first).queryByRole('link')).not.toBeInTheDocument()
    expect(first).toHaveTextContent('No valid source')
  })

  it('lists the pages reviewed and the pages skipped, with reasons', async () => {
    const c = company('c_001')
    await open('/companies/c_001/website', 'c_001')
    const reviewedCount = c?.website.pagesReviewed.length as number
    expect(
      screen.getByRole('heading', { name: `Pages reviewed (${reviewedCount})` }),
    ).toBeInTheDocument()
    const reviewed = within(screen.getByRole('list', { name: 'Pages reviewed' })).getAllByRole(
      'listitem',
    )
    expect(reviewed).toHaveLength(reviewedCount)
    for (const li of reviewed) expect(within(li).getByRole('link')).toBeInTheDocument()

    const skipped = within(screen.getByRole('list', { name: 'Pages skipped' })).getAllByRole(
      'listitem',
    )
    expect(skipped).toHaveLength(c?.website.skipped.length as number)
    expect(skipped[0]).toHaveTextContent('Requires login.')
  })

  it('explains why everything is missing when the website was offline', async () => {
    const reason = 'Website did not respond (timed out after 30 s).'
    await open('/companies/c_002/website', 'c_002')
    const about = region('About the company')
    // the reason is stated once for the card, and every missing row says "Not available"
    expect(within(about).getAllByText(reason)).toHaveLength(1)
    expect(about).toHaveTextContent('Why details are missing:')
    expect(valueOf(about, 'Summary')).toHaveTextContent('Not available')
    expect(valueOf(about, 'Services')).toHaveTextContent('Not available')
    expect(valueOf(about, 'Markets')).toHaveTextContent('Not available')
    expect(screen.getByText('No facts recorded yet')).toBeInTheDocument()
    expect(region('Facts and inferences')).toHaveTextContent(reason)
    expect(screen.getByText(/No pages were reviewed/)).toBeInTheDocument()
    // the attempt itself is recorded, with its reason
    expect(
      within(screen.getByRole('list', { name: 'Pages skipped' })).getByText(
        'Site did not respond.',
      ),
    ).toBeInTheDocument()
  })

  it('says "Not collected yet" for a company that has not been researched', async () => {
    await open('/companies/c_012/website', 'c_012')
    const about = region('About the company')
    expect(about).toHaveTextContent('Why details are missing: Not collected yet')
    expect(valueOf(about, 'Summary')).toHaveTextContent('Not available')
  })

  it('keeps the reason on the row when only one or two details are missing', async () => {
    const c = company('c_001')
    if (c) {
      c.website.summary = undefined
      c.stages.website = { status: 'partial', reason: 'Only the home page could be read.' }
    }
    await open('/companies/c_001/website', 'c_001')
    const about = region('About the company')
    expect(about).not.toHaveTextContent('Why details are missing:')
    expect(valueOf(about, 'Summary')).toHaveTextContent('Not available')
    expect(valueOf(about, 'Summary')).toHaveTextContent('Only the home page could be read.')
  })
})

describe('Socials tab', () => {
  it('shows each network as a link, or as Not found', async () => {
    const c = company('c_001')
    await open('/companies/c_001/socials', 'c_001')
    const card = region('Official social profiles')
    for (const [key, label] of [
      ['linkedin', 'LinkedIn'],
      ['facebook', 'Facebook'],
      ['instagram', 'Instagram'],
      ['x', 'X'],
      ['youtube', 'YouTube'],
    ] as const) {
      const value = valueOf(card, label)
      const url = c?.socials[key]
      if (url) expect(within(value).getByRole('link')).toHaveAttribute('href', href(url))
      else expect(value).toHaveTextContent('Not found')
    }
    expect(valueOf(card, 'LinkedIn')).toHaveTextContent('linkedin.com/company/')
  })

  it('explains why a profile was not found', async () => {
    const c = company('c_002') // only LinkedIn was found
    await open('/companies/c_002/socials', 'c_002')
    const card = region('Official social profiles')
    expect(within(valueOf(card, 'LinkedIn')).getByRole('link')).toHaveAttribute(
      'href',
      href(c?.socials.linkedin),
    )
    expect(valueOf(card, 'Facebook')).toHaveTextContent('Not found')
    // the reason is given once for the card
    expect(card).toHaveTextContent('Why details are missing: Only the LinkedIn page was found.')
  })

  it('says "Not collected yet" when social profiles were never looked for', async () => {
    await open('/companies/c_012/socials', 'c_012')
    const card = region('Official social profiles')
    expect(card).toHaveTextContent('Why details are missing: Not collected yet')
    expect(valueOf(card, 'LinkedIn')).toHaveTextContent('Not found')
  })

  it('lists other social links', async () => {
    const c = company('c_001')
    if (c) c.socials.other = ['https://www.tiktok.com/@example']
    await open('/companies/c_001/socials', 'c_001')
    const other = valueOf(region('Official social profiles'), 'Other')
    expect(within(other).getByRole('link')).toHaveAttribute(
      'href',
      'https://www.tiktok.com/@example',
    )
  })
})
