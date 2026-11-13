import { api, configureClient, setUnauthorizedHandler } from '@/api/client'
import { disableDelays, mockState } from '@/mocks/config'
import { resetDb } from '@/mocks/db'
import { resetLoginAttempts } from '@/mocks/handlers/auth'
import { setSession } from '@/mocks/http'
import { server } from '@/mocks/server'

export const TEST_API = 'http://localhost/api'

/** Call once at the top of a test file to run it against the fake backend (src/mocks). */
export function setupMockApi() {
  beforeAll(() => {
    server.listen({ onUnhandledFrame: 'error' })
    disableDelays()
    configureClient({ base: TEST_API, retryIntervalMs: 10, wakeTimeoutMs: 300 })
  })
  afterAll(() => server.close())
  beforeEach(() => {
    resetDb()
    resetLoginAttempts()
    setSession(null)
    mockState.wakeUntil = 0
    setUnauthorizedHandler(() => {})
    window.history.replaceState({}, '', '/')
  })
}

/** Sign in to the fake backend without the UI. */
export const signIn = (email = 'admin@example.com') =>
  api.post('/auth/login', { email, password: 'password' })
