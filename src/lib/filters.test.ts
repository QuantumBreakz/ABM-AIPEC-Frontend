import { COMPANY_FILTER_FIELDS, filtersFromParams, filtersToParams } from './filters'
import { formatRelative, safeHttpUrl } from './format'

describe('filters <-> URL', () => {
  it('round-trips every kind of value', () => {
    const values = {
      q: 'oil',
      edition: 2026,
      country: 'AE',
      step: 'website',
      stepStatus: 'failed',
      hasContacts: false,
      duplicate: true,
    }
    const params = filtersToParams(values, COMPANY_FILTER_FIELDS)
    expect(filtersFromParams(params, COMPANY_FILTER_FIELDS)).toEqual(values)
  })

  it('ignores invalid values from a hand-edited URL', () => {
    const params = new URLSearchParams('step=nonsense&edition=abc&hasContacts=maybe&country=AE')
    expect(filtersFromParams(params, COMPANY_FILTER_FIELDS)).toEqual({ country: 'AE' })
  })

  it('keeps unrelated params, removes cleared filters and resets the page', () => {
    const current = new URLSearchParams('country=AE&sort=-name&page=3')
    const next = filtersToParams({ q: 'gas' }, COMPANY_FILTER_FIELDS, current)
    expect(next.get('sort')).toBe('-name')
    expect(next.get('q')).toBe('gas')
    expect(next.has('country')).toBe(false)
    expect(next.has('page')).toBe(false)
  })
})

describe('format helpers', () => {
  it('only allows http(s) URLs', () => {
    expect(safeHttpUrl('https://example.com/a')?.hostname).toBe('example.com')
    expect(safeHttpUrl('javascript:alert(1)')).toBeUndefined()
    expect(safeHttpUrl('data:text/html,hi')).toBeUndefined()
    expect(safeHttpUrl('not a url')).toBeUndefined()
    expect(safeHttpUrl(undefined)).toBeUndefined()
  })

  it('formats relative times and rejects bad dates', () => {
    const now = new Date('2026-11-13T12:00:00Z')
    expect(formatRelative('2026-11-13T09:00:00Z', now)).toBe('3 hours ago')
    expect(formatRelative('2026-11-13T11:59:50Z', now)).toBe('just now')
    expect(formatRelative('garbage', now)).toBeUndefined()
    expect(formatRelative(undefined, now)).toBeUndefined()
  })
})
