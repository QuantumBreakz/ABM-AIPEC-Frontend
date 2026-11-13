import type { EmailStatus, Paged, Run, RunStep } from '@/api/types'
import { STEP_KEYS } from '@/api/types'
import { mockConfig } from '../config'
import { db, nextId } from '../db'
import { refresh } from '../derive'
import { badRequest, conflict, json, notFound, paginate, route } from '../http'
import { inEdition } from '../stats'

const ALL_STEPS: RunStep[] = ['directory', ...STEP_KEYS]

/**
 * Runs advance lazily: every time a running run is read, each of its steps moves forward
 * a bit. No timers are needed, and polling the run shows it filling up.
 */
export function advanceRuns() {
  for (const run of db.runs) {
    if (run.status !== 'running') continue
    for (const step of run.steps) {
      const p = run.perStep[step]
      if (!p || p.queued === 0) continue
      const total = p.queued + p.done + p.failed
      const chunk = Math.min(p.queued, Math.max(1, Math.ceil(total * mockConfig.runStepFraction)))
      const failed = step === 'website' ? Math.floor(chunk / 20) : 0
      p.queued -= chunk
      p.done += chunk - failed
      p.failed += failed
      if (step === run.steps[0]) {
        run.counts.attempted += chunk
        run.counts.completed += chunk - failed
        run.counts.failed += failed
      }
      if (failed > 0) {
        run.errors.unshift({
          step,
          message: 'Website did not respond (timed out after 30 s).',
          at: new Date().toISOString(),
        })
        run.errors = run.errors.slice(0, 100)
      }
    }
    if (run.steps.every((s) => (run.perStep[s]?.queued ?? 0) === 0)) {
      run.status = 'completed'
      run.finishedAt = new Date().toISOString()
      if (run.steps.length === 1 && run.steps[0] === 'verification') applyVerification(run.edition)
    }
  }
}

function hashOf(text: string) {
  return [...text].reduce((sum, ch) => sum + ch.charCodeAt(0), 0)
}

/** Fill in check results for every email that was never checked. */
export function applyVerification(edition: number) {
  const hasMillionVerifier = db.providers.millionverifier
  const now = new Date().toISOString()
  for (const company of inEdition(edition)) {
    let touched = false
    for (const contact of company.contacts) {
      for (const email of contact.emails) {
        if (email.verification.status !== 'not_checked') continue
        // Without a real verifier only the domain can be checked, so nothing can become Verified.
        let status: EmailStatus = 'unknown'
        if (hasMillionVerifier) {
          const roll = hashOf(email.address) % 10
          status = roll < 6 ? 'verified' : roll < 7 ? 'risky' : roll < 8 ? 'invalid' : 'unknown'
        }
        email.verification = {
          status,
          checkedAt: now,
          source: hasMillionVerifier ? 'millionverifier' : 'mx-check',
        }
        touched = true
      }
    }
    if (touched) {
      company.stages.verification = {
        status: hasMillionVerifier ? 'completed' : 'partial',
        reason: hasMillionVerifier ? undefined : 'MX check only: deliverability was not confirmed.',
        updatedAt: now,
      }
      refresh(company, true)
    }
  }
}

export function createRun(
  edition: number,
  steps: RunStep[],
  startedBy: string,
  queued?: number,
): Run {
  const discovered = inEdition(edition).length
  const perStep: Run['perStep'] = {}
  for (const s of steps) perStep[s] = { queued: queued ?? discovered, done: 0, failed: 0 }
  const run: Run = {
    id: nextId('r'),
    edition,
    status: 'running',
    steps,
    startedBy,
    createdAt: new Date().toISOString(),
    counts: {
      discovered,
      attempted: 0,
      completed: 0,
      partial: 0,
      restricted: 0,
      failed: 0,
      duplicate: 0,
    },
    perStep,
    errors: [],
  }
  db.runs.unshift(run)
  return run
}

export function assertNoActiveRun() {
  if (db.runs.some((r) => r.status === 'running')) {
    throw conflict(
      'A run is already in progress. Pause or wait for it to finish before starting another.',
    )
  }
}

function getRun(id: string | undefined) {
  const run = db.runs.find((r) => r.id === id)
  if (!run) throw notFound('Run')
  return run
}

export const runHandlers = [
  route.get('/runs', 'user', ({ url }) => {
    advanceRuns()
    return json<Paged<Run>>(paginate(db.runs, url))
  }),

  route.post('/runs', 'admin', async ({ body, user }) => {
    const input = await body<{ edition?: unknown; steps?: unknown }>()
    const edition = Number(input.edition)
    if (!db.events.some((e) => e.edition === edition))
      throw badRequest('Pick an edition that exists.')
    let steps = ALL_STEPS
    if (input.steps !== undefined) {
      if (
        !Array.isArray(input.steps) ||
        input.steps.length === 0 ||
        input.steps.some((s) => !ALL_STEPS.includes(s as RunStep))
      ) {
        throw badRequest(`"steps" must be a non-empty list of: ${ALL_STEPS.join(', ')}.`)
      }
      steps = input.steps as RunStep[]
    }
    assertNoActiveRun()
    return json<Run>(createRun(edition, steps, user.email), 202)
  }),

  route.get('/runs/:id', 'user', ({ params }) => {
    advanceRuns()
    return json<Run>(getRun(params.id))
  }),

  route.post('/runs/:id/pause', 'admin', ({ params }) => {
    const run = getRun(params.id)
    if (run.status !== 'running') throw conflict('Only a running run can be paused.')
    run.status = 'paused'
    return json<Run>(run)
  }),

  route.post('/runs/:id/resume', 'admin', ({ params }) => {
    const run = getRun(params.id)
    if (run.status !== 'paused') throw conflict('Only a paused run can be resumed.')
    assertNoActiveRun()
    run.status = 'running'
    return json<Run>(run)
  }),
]
