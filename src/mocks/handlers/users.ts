import type { Role, User } from '@/api/types'
import { db, nextId } from '../db'
import {
  badRequest,
  conflict,
  EMAIL_RE,
  json,
  noContent,
  notFound,
  publicUser,
  requireString,
  route,
} from '../http'

const ROLES: Role[] = ['admin', 'reviewer']

function validPassword(value: unknown) {
  if (typeof value !== 'string' || value.length < 8) {
    throw badRequest('Password must be at least 8 characters.')
  }
  return value
}
function validRole(value: unknown): Role {
  if (!ROLES.includes(value as Role)) throw badRequest('Role must be "admin" or "reviewer".')
  return value as Role
}

export const userHandlers = [
  route.get('/users', 'admin', () => json<User[]>(db.users.map(publicUser))),

  route.post('/users', 'admin', async ({ body }) => {
    const input = await body<{ email?: unknown; password?: unknown; role?: unknown }>()
    const email = requireString(input.email, 'email').toLowerCase()
    if (!EMAIL_RE.test(email)) throw badRequest('Enter a valid email address.')
    if (db.users.some((u) => u.email.toLowerCase() === email)) {
      throw conflict('A user with this email already exists.')
    }
    const user = {
      id: nextId('u'),
      email,
      role: validRole(input.role),
      createdAt: new Date().toISOString(),
      password: validPassword(input.password),
    }
    db.users.push(user)
    return json<User>(publicUser(user), 201)
  }),

  route.patch('/users/:id', 'admin', async ({ params, body }) => {
    const user = db.users.find((u) => u.id === params.id)
    if (!user) throw notFound('User')
    const input = await body<{ role?: unknown; password?: unknown }>()
    if (input.role !== undefined) user.role = validRole(input.role)
    if (input.password !== undefined) user.password = validPassword(input.password)
    return json<User>(publicUser(user))
  }),

  route.delete('/users/:id', 'admin', ({ params, user }) => {
    const target = db.users.find((u) => u.id === params.id)
    if (!target) throw notFound('User')
    if (target.id === user.id) throw conflict('You cannot delete your own account.')
    db.users.splice(db.users.indexOf(target), 1)
    return noContent()
  }),
]
