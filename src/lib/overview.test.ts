import { EMAIL_STATUSES, STEP_STATUSES } from '@/api/types'
import { EMAIL_FILL, EMAIL_INK, EMAIL_ORDER, STACK_ORDER, STEP_FILL, toSegments } from './overview'

describe('stack order and colours', () => {
  it('places every step status exactly once, each with a fill', () => {
    expect([...STACK_ORDER].sort()).toEqual([...STEP_STATUSES].sort())
    for (const status of STEP_STATUSES) expect(STEP_FILL[status]).toMatch(/^var\(--/)
  })

  it('places every email status exactly once, each with a fill and a label colour', () => {
    expect([...EMAIL_ORDER].sort()).toEqual([...EMAIL_STATUSES].sort())
    for (const status of EMAIL_STATUSES) {
      expect(EMAIL_FILL[status]).toMatch(/^var\(--/)
      expect(EMAIL_INK[status]).toMatch(/^var\(--/)
    }
  })

  it('gives different fills to different statuses', () => {
    expect(new Set(Object.values(STEP_FILL)).size).toBe(STEP_STATUSES.length)
    expect(new Set(Object.values(EMAIL_FILL)).size).toBe(EMAIL_STATUSES.length)
  })
})

describe('toSegments', () => {
  it('keeps stack order, drops zero parts and works out shares', () => {
    const segments = toSegments({ failed: 25, completed: 50, partial: 0 }, STACK_ORDER, 100)
    expect(segments).toEqual([
      { key: 'completed', count: 50, percent: 50 },
      { key: 'failed', count: 25, percent: 25 },
    ])
  })

  it('does not divide by zero', () => {
    expect(toSegments({ failed: 3 }, STACK_ORDER, 0)).toEqual([
      { key: 'failed', count: 3, percent: 0 },
    ])
    expect(toSegments({}, STACK_ORDER, 0)).toEqual([])
  })
})
