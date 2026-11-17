import type { User } from '@/api/types'
import { db, nextId } from '../db'
import {
  badRequest,
  conflict,
  currentUser,
  EMAIL_RE,
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
    if (user.active === false) {
      throw new HttpError(
        403,
        'forbidden',
        'This account has been deactivated. Contact an administrator.',
      )
    }
    failedLogins = 0
    setSession(user.id)
    return json<User>(publicUser(user))
  }),

  route.post('/auth/signup', 'none', async ({ body }) => {
    const input = await body<{ email?: unknown; username?: unknown; password?: unknown }>()
    const email = requireString(input.email, 'email').toLowerCase()
    if (!EMAIL_RE.test(email)) throw badRequest('Enter a valid email address.')
    const password = requireString(input.password, 'password')
    if (password.length < 8) throw badRequest('Password must be at least 8 characters.')
    if (db.users.some((u) => u.email.toLowerCase() === email)) {
      throw conflict('An account with this email already exists.')
    }
    const username =
      typeof input.username === 'string' && input.username.trim().length >= 2
        ? input.username.trim()
        : undefined
    const user = {
      id: nextId('u'),
      email,
      username,
      role: 'user' as const,
      active: true,
      createdAt: new Date().toISOString(),
      password,
    }
    db.users.push(user)
    setSession(user.id)
    return json<User>(publicUser(user), 201)
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
