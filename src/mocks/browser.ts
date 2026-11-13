import { setupWorker } from 'msw/browser'
import { mockState, pageParam } from './config'
import { handlers } from './handlers'

/**
 * Start the fake backend in the browser. Called from main.tsx before React renders.
 * Switches (add to the page URL):
 *   ?mock_wake=1            every request answers 503 for the first 5 s (tests the waking banner)
 *   ?mock_role=reviewer     signs you in as a reviewer (or admin) without the login form
 *   ?mock_fail=/companies   forces a 500 on matching paths (tests error states)
 */
export async function startMocks() {
  if (pageParam('mock_wake') === '1') mockState.wakeUntil = Date.now() + 5_000
  const worker = setupWorker(...handlers)
  await worker.start({
    // Fonts, Vite assets and anything outside /api pass straight through.
    onUnhandledFrame: 'bypass',
    quiet: true,
  })
}
