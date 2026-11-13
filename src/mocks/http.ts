import {
  delay,
  HttpResponse,
  http,
  type JsonBodyType,
  type PathParams,
  type StrictRequest,
} from 'msw'
import type { ApiErrorCode, Role, User } from '@/api/types'
import { mockConfig, mockState, pageParam } from './config'
import { db } from './db'

/** Thrown inside a handler to answer with the contract's error shape. */
export class HttpError extends Error {
  readonly status: number
  readonly code: ApiErrorCode
  readonly details?: Record<string, unknown>

  constructor(
    status: number,
    code: ApiErrorCode,
    message: string,
    details?: Record<string, unknown>,
  ) {
    super(message)
    this.status = status
    this.code = code
    this.details = details
  }
}

export const badRequest = (message: string, details?: Record<string, unknown>) =>
  new HttpError(400, 'bad_request', message, details)
export const notFound = (what = 'Item') => new HttpError(404, 'not_found', `${what} not found.`)
export const conflict = (message: string) => new HttpError(409, 'conflict', message)

// ---------- session (the real backend uses an httpOnly cookie) ----------
const SESSION_KEY = 'mock:session'
let sessionUserId: string | null = null

function readStored() {
  try {
    return sessionStorage.getItem(SESSION_KEY)
  } catch {
    return null
  }
}
function writeStored(id: string | null) {
  try {
    if (id) sessionStorage.setItem(SESSION_KEY, id)
    else sessionStorage.removeItem(SESSION_KEY)
  } catch {
    // storage blocked: the session still works for this page load
  }
}

export function setSession(userId: string | null) {
  sessionUserId = userId
  writeStored(userId)
}

export function publicUser(user: {
  id: string
  email: string
  role: Role
  createdAt: string
}): User {
  return { id: user.id, email: user.email, role: user.role, createdAt: user.createdAt }
}

/** ?mock_role=reviewer signs you in as that role without the login form. */
export function currentUser(): User | null {
  const roleParam = pageParam('mock_role')
  if (roleParam === 'admin' || roleParam === 'reviewer') {
    const forced = db.users.find((u) => u.role === roleParam)
    if (forced) setSession(forced.id)
  }
  const id = sessionUserId ?? readStored()
  const user = db.users.find((u) => u.id === id)
  return user ? publicUser(user) : null
}

// ---------- responses ----------
export function json<T>(body: T, status = 200) {
  return HttpResponse.json(body as JsonBodyType, { status })
}
export const noContent = () => new HttpResponse(null, { status: 204 })

function errorResponse(error: HttpError) {
  return HttpResponse.json(
    {
      error: {
        code: error.code,
        message: error.message,
        ...(error.details ? { details: error.details } : {}),
      },
    },
    { status: error.status },
  )
}

// ---------- request wrapper ----------
export type Auth = 'none' | 'user' | 'admin'

export type Ctx = {
  request: StrictRequest<JsonBodyType>
  params: Record<string, string>
  url: URL
  user: User
  body: <T = Record<string, unknown>>() => Promise<T>
}

type Resolver = (ctx: Ctx) => Promise<Response> | Response

function wrap(auth: Auth, resolver: Resolver) {
  return async ({
    request,
    params,
  }: {
    request: StrictRequest<JsonBodyType>
    params: PathParams
  }) => {
    try {
      const url = new URL(request.url)

      // ?mock_wake=1 : act like a sleeping server for a few seconds.
      if (Date.now() < mockState.wakeUntil) return new HttpResponse(null, { status: 503 })

      const ms = mockConfig.delayMin + Math.random() * (mockConfig.delayMax - mockConfig.delayMin)
      if (ms > 0) await delay(ms)

      // ?mock_fail=/companies : force a 500 on matching paths to test error states.
      const fail = pageParam('mock_fail')
      if (fail && url.pathname.includes(fail)) {
        throw new HttpError(500, 'internal', 'Simulated server error (mock_fail).')
      }

      const user = currentUser()
      if (auth !== 'none' && !user) throw new HttpError(401, 'unauthorized', 'Please sign in.')
      if (auth === 'admin' && user?.role !== 'admin') {
        throw new HttpError(403, 'forbidden', 'Only an admin can do this.')
      }

      return await resolver({
        request,
        url,
        user: user as User,
        params: Object.fromEntries(
          Object.entries(params).map(([k, v]) => [k, Array.isArray(v) ? (v[0] ?? '') : (v ?? '')]),
        ),
        body: async <T>() => {
          try {
            return (await request.clone().json()) as T
          } catch {
            throw badRequest('Request body must be valid JSON.')
          }
        },
      })
    } catch (error) {
      if (error instanceof HttpError) return errorResponse(error)
      throw error
    }
  }
}

/** Route builder: paths are the contract paths; the /api prefix is added here. */
const P = '*/api'
export const route = {
  get: (path: string, auth: Auth, resolver: Resolver) =>
    http.get(`${P}${path}`, wrap(auth, resolver)),
  post: (path: string, auth: Auth, resolver: Resolver) =>
    http.post(`${P}${path}`, wrap(auth, resolver)),
  patch: (path: string, auth: Auth, resolver: Resolver) =>
    http.patch(`${P}${path}`, wrap(auth, resolver)),
  delete: (path: string, auth: Auth, resolver: Resolver) =>
    http.delete(`${P}${path}`, wrap(auth, resolver)),
}

// ---------- shared request helpers ----------
export function paginate<T>(items: T[], url: URL) {
  const toInt = (name: string, fallback: number) => {
    const raw = url.searchParams.get(name)
    if (raw === null || raw === '') return fallback
    const n = Number(raw)
    if (!Number.isInteger(n) || n < 1)
      throw badRequest(`"${name}" must be a positive whole number.`)
    return n
  }
  const page = toInt('page', 1)
  const pageSize = Math.min(toInt('pageSize', 50), 200)
  const start = (page - 1) * pageSize
  return { items: items.slice(start, start + pageSize), page, pageSize, total: items.length }
}

export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
export const DOMAIN_RE = /^(?!-)[a-z0-9-]+(\.[a-z0-9-]+)+$/i

export function requireString(value: unknown, name: string) {
  if (typeof value !== 'string' || value.trim() === '') throw badRequest(`"${name}" is required.`)
  return value.trim()
}
