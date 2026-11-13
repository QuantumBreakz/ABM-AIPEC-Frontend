import type { Run } from '@/api/types'
import { runPercent, RUN_STEP_LABEL, RUN_STEPS, stepProgress } from './runs'

const run = (over: Partial<Run>): Run => ({
  id: 'r_x',
  edition: 2026,
  status: 'running',
  steps: ['directory', 'profile'],
  startedBy: 'admin@example.com',
  createdAt: new Date().toISOString(),
  counts: {
    discovered: 0,
    attempted: 0,
    completed: 0,
    partial: 0,
    restricted: 0,
    failed: 0,
    duplicate: 0,
  },
  perStep: {},
  errors: [],
  ...over,
})

describe('runPercent', () => {
  it('counts done and failed as finished, queued as not', () => {
    const r = run({
      perStep: {
        directory: { queued: 0, done: 10, failed: 0 },
        profile: { queued: 6, done: 3, failed: 1 },
      },
    })
    // finished 14 of 20
    expect(runPercent(r)).toBe(70)
  })

  it('is 0 with no data and never divides by zero', () => {
    expect(runPercent(run({ perStep: {} }))).toBe(0)
    expect(runPercent(run({ perStep: { directory: { queued: 0, done: 0, failed: 0 } } }))).toBe(0)
  })

  it('is always 100 for a completed run', () => {
    expect(
      runPercent(
        run({ status: 'completed', perStep: { directory: { queued: 5, done: 0, failed: 0 } } }),
      ),
    ).toBe(100)
  })

  it('only looks at the steps the run actually has', () => {
    const r = run({
      steps: ['directory'],
      perStep: {
        directory: { queued: 1, done: 1, failed: 0 },
        website: { queued: 99, done: 0, failed: 0 },
      },
    })
    expect(runPercent(r)).toBe(50)
  })
})

describe('step helpers', () => {
  it('has a label for every step, directory first', () => {
    expect(RUN_STEPS[0]).toBe('directory')
    for (const step of RUN_STEPS) expect(RUN_STEP_LABEL[step]).toBeTruthy()
  })

  it('treats a missing step as nothing done', () => {
    expect(stepProgress(run({}), 'website')).toEqual({ queued: 0, done: 0, failed: 0 })
  })
})
