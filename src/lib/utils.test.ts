import { cn } from './utils'

describe('cn', () => {
  it('merges and resolves Tailwind conflicts', () => {
    expect(cn('p-2', undefined, 'p-4')).toBe('p-4')
  })
})
