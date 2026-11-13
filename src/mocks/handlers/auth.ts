import type { User } from '@/api/types'
import { db } from '../db'
import {
  currentUser,
  HttpError,
  json,
  noContent,
  publicUser,
  requireString,
  route,
  setSession,
} from '../http'

let failedLogins = 0

export const authHandlers = [
  route.post('/auth/login', 'none', async ({ body }) => {
    const input = await body<{ email?: unknown; password?: unknown }>()
    const email = requireString(input.email, 'email').toLowerCase()
    const password = requireString(input.password, 'password')
    if (failedLogins >= 5) {
      throw new HttpError(
        429,
        'rate_limited',
        'Too many failed attempts. Please wait a few minutes and try again.',
      )
    }
    const user = db.users.find((u) => u.email.toLowerCase() === email && u.password === password)
    if (!user) {
      failedLogins += 1
      throw new HttpError(401, 'unauthorized', 'Wrong email or password.')
    }
    failedLogins = 0
    setSession(user.id)
    return json<User>(publicUser(user))
  }),

  route.post('/auth/logout', 'user', () => {
    setSession(null)
    return noContent()
  }),

  route.get('/auth/me', 'none', () => {
    const user = currentUser()
    if (!user) throw new HttpError(401, 'unauthorized', 'Not signed in.')
    return json<User>(user)
  }),
]

/** Test helper: forget failed login attempts. */
export function resetLoginAttempts() {
  failedLogins = 0
}
