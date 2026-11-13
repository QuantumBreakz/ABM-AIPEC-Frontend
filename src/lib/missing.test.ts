import { shortUrl } from './format'
import { missingReason } from './missing'

describe('missingReason', () => {
  it('prefers a recorded reason', () => {
    expect(missingReason({ status: 'failed', reason: 'Site offline' }, 'fallback')).toBe(
      'Site offline',
    )
  })

  it('says "Not collected yet" while the step has not run', () => {
    expect(missingReason({ status: 'not_started' }, 'fallback')).toBe('Not collected yet')
    expect(missingReason({ status: 'in_progress' }, 'fallback')).toBe('Not collected yet')
  })

  it('uses the fallback for a finished step with nothing to show', () => {
    expect(missingReason({ status: 'completed' }, 'The website does not say')).toBe(
      'The website does not say',
    )
  })
})

describe('shortUrl', () => {
  it('drops the scheme, www and a trailing slash', () => {
    expect(shortUrl('https://www.example.com/about/')).toBe('example.com/about')
    expect(shortUrl('https://example.com')).toBe('example.com')
    expect(shortUrl('http://example.com/a/b?x=1')).toBe('example.com/a/b')
  })

  it('returns the raw text for something that is not a web address', () => {
    expect(shortUrl('javascript:alert(1)')).toBe('javascript:alert(1)')
    expect(shortUrl(undefined)).toBe('')
  })
})
