import { setupServer } from 'msw/node'
import { handlers } from './handlers'

/** Node version of the fake backend, used by tests (Vitest). */
export const server = setupServer(...handlers)
