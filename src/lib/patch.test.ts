import type { Company } from '@/api/types'
import { db } from '@/mocks/db'
import { formatHistoryValue, historyFieldLabel } from './history'
import { applyPatch, URL_MESSAGE, validateUrl } from './patch'

const base = () => structuredClone(db.companies.find((c) => c.id === 'c_001') as Company)

describe('applyPatch', () => {
  it('changes the named fields and marks them as locked', () => {
    const company = base()
    const next = applyPatch(company, {
      'website.summary': 'New summary',
      'website.services': ['A', 'B'],
      leadershipCoverage: 'reviewed',
    })
    expect(next.website.summary).toBe('New summary')
    expect(next.website.services).toEqual(['A', 'B'])
    expect(next.leadershipCoverage).toBe('reviewed')
    expect(next.lockedFields).toEqual(
      expect.arrayContaining(['website.summary', 'website.services', 'leadershipCoverage']),
    )
  })

  it('clears a field when the value is null', () => {
    const next = applyPatch(base(), { 'socials.linkedin': null, 'salesNav.accountUrl': null })
    expect(next.socials.linkedin).toBeUndefined()
    expect(next.salesNav.accountUrl).toBeUndefined()
  })

  it('does not touch the original, and never lists a field twice', () => {
    const company = base()
    const once = applyPatch(company, { 'website.summary': 'One' })
    const twice = applyPatch(once, { 'website.summary': 'Two' })
    expect(company.website.summary).not.toBe('One')
    expect(company.lockedFields).not.toContain('website.summary')
    expect(twice.lockedFields.filter((f) => f === 'website.summary')).toHaveLength(1)
  })
})

describe('validateUrl', () => {
  it('accepts an empty value (clear) and http(s) addresses', () => {
    expect(validateUrl(undefined)).toBeUndefined()
    expect(validateUrl('https://example.com')).toBeUndefined()
    expect(validateUrl(['https://a.example.com', 'http://b.example.com'])).toBeUndefined()
  })

  it('refuses anything else, including one bad line in a list', () => {
    expect(validateUrl('example.com')).toBe(URL_MESSAGE)
    expect(validateUrl('javascript:alert(1)')).toBe(URL_MESSAGE)
    expect(validateUrl(['https://a.example.com', 'nope'])).toBe(URL_MESSAGE)
  })
})

describe('history wording', () => {
  it('names fields in plain English', () => {
    expect(historyFieldLabel('website.url')).toBe('Website address')
    expect(historyFieldLabel('leadershipCoverage')).toBe('Leadership coverage')
    expect(historyFieldLabel('stages.website')).toBe('Website status')
    expect(historyFieldLabel('stages.verification')).toBe('Email verification status')
    expect(historyFieldLabel('ai.approve')).toBe('AI draft approved')
    expect(historyFieldLabel('something.new')).toBe('something.new')
  })

  it('writes empty values as "(empty)" and lists as text', () => {
    expect(formatHistoryValue(undefined)).toBe('(empty)')
    expect(formatHistoryValue(null)).toBe('(empty)')
    expect(formatHistoryValue('')).toBe('(empty)')
    expect(formatHistoryValue([])).toBe('(empty)')
    expect(formatHistoryValue(['A', 'B'])).toBe('A, B')
    expect(formatHistoryValue('confirmed_partial')).toBe('confirmed partial')
  })
})
