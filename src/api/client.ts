import type { ApiErrorBody } from './types'
import { beginWaking, endWaking } from './waking'

/**
 * The only place in the app that calls fetch().
 *  - prefixes every path with the API base (/api), sends the login cookie
 *  - turns error responses into ApiError
 *  - on 401 calls the unauthorized handler (redirect to /login)
 *  - retries while the backend is waking up (network error, 502/503/504, or an HTML page)
 */

export class ApiError extends Error {
  readonly status: number
  readonly code: string
  readonly details?: Record<string, unknown>

  constructor(status: number, code: string, message: string, details?: Record<string, unknown>) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.code = code
    this.details = details
  }
}

const settings = {
  base: import.meta.env.VITE_API_BASE ?? '/api',
  /** Wait between wake-up retries. */
  retryIntervalMs: 3_000,
  /** Give up after this long. */
  wakeTimeoutMs: 90_000,
}

/** Override timing/base (used by tests). */
export function configureClient(overrides: Partial<typeof settings>) {
  Object.assign(settings, overrides)
}

// ---------- 401 handling ----------
let unauthorizedHandler: () => void = () => {
  if (window.location.pathname.startsWith('/login')) return
  const next = encodeURIComponent(window.location.pathname + window.location.search)
  window.location.assign(`/login?next=${next}`)
}

/** AuthProvider registers this so a 401 clears the user and navigates via the router. */
export function setUnauthorizedHandler(handler: () => void) {
  unauthorizedHandler = handler
}

/** A 401 from these calls is an expected answer, not an expired session. */
const NO_REDIRECT_ON_401 = ['/auth/login', '/auth/me']

// ---------- URL building ----------
export type Params = Record<string, string | number | boolean | null | undefined>

export function apiUrl(path: string, params?: Params): string {
  const query = new URLSearchParams()
  for (const [key, value] of Object.entries(params ?? {})) {
    if (value === undefined || value === null || value === '') continue
    query.set(key, String(value))
  }
  const qs = query.toString()
  return `${settings.base}${path}${qs ? `?${qs}` : ''}`
}

// ---------- helpers ----------
const DEFAULT_CODES: Record<number, string> = {
  400: 'bad_request',
  401: 'unauthorized',
  403: 'forbidden',
  404: 'not_found',
  409: 'conflict',
  429: 'rate_limited',
}

function isAbort(error: unknown) {
  return error instanceof DOMException && error.name === 'AbortError'
}

function sleep(ms: number, signal?: AbortSignal) {
  return new Promise<void>((resolve, reject) => {
    if (signal?.aborted) return reject(new DOMException('Aborted', 'AbortError'))
    const timer = setTimeout(() => {
      signal?.removeEventListener('abort', onAbort)
      resolve()
    }, ms)
    const onAbort = () => {
      clearTimeout(timer)
      reject(new DOMException('Aborted', 'AbortError'))
    }
    signal?.addEventListener('abort', onAbort, { once: true })
  })
}

/** Render's "waking up" answer: 502/503/504, or an HTML page where JSON was expected. */
function looksLikeWaking(res: Response) {
  if ([502, 503, 504].includes(res.status)) return true
  const isHtml = (res.headers.get('content-type') ?? '').includes('text/html')
  return isHtml && !(res.status >= 400 && res.status < 500)
}

async function toApiError(res: Response): Promise<ApiError> {
  try {
    const body = (await res.json()) as Partial<ApiErrorBody>
    if (body.error?.message) {
      return new ApiError(
        res.status,
        body.error.code ?? DEFAULT_CODES[res.status] ?? 'internal',
        body.error.message,
        body.error.details,
      )
    }
  } catch {
    // body was not JSON; fall through
  }
  return new ApiError(
    res.status,
    DEFAULT_CODES[res.status] ?? 'internal',
    `Request failed with status ${res.status}`,
  )
}

// ---------- the request loop ----------
type RequestOptions = { params?: Params; body?: unknown; signal?: AbortSignal }

async function request<T>(method: string, path: string, opts: RequestOptions = {}): Promise<T> {
  const url = apiUrl(path, opts.params)
  const init: RequestInit = {
    method,
    credentials: 'include',
    signal: opts.signal,
    headers: {
      Accept: 'application/json',
      ...(opts.body !== undefined ? { 'Content-Type': 'application/json' } : {}),
    },
    body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
  }

  const startedAt = Date.now()
  let showingBanner = false

  try {
    for (;;) {
      let res: Response | undefined
      try {
        res = await fetch(url, init)
      } catch (error) {
        if (isAbort(error)) throw error
        // network error: treat as "backend not reachable yet"
      }

      if (res && !looksLikeWaking(res)) return await handle<T>(res, path)

      // Backend not ready: retry until the wake timeout runs out.
      const elapsed = Date.now() - startedAt
      if (elapsed + settings.retryIntervalMs > settings.wakeTimeoutMs) {
        throw new ApiError(
          res?.status ?? 503,
          'unavailable',
          'The server did not wake up in time. Please try again in a minute.',
        )
      }
      if (!showingBanner) {
        showingBanner = true
        beginWaking()
      }
      await sleep(settings.retryIntervalMs, opts.signal)
    }
  } finally {
    if (showingBanner) endWaking()
  }
}

async function handle<T>(res: Response, path: string): Promise<T> {
  if (res.status === 401 && !NO_REDIRECT_ON_401.includes(path)) unauthorizedHandler()
  if (!res.ok) throw await toApiError(res)
  if (res.status === 204) return undefined as T
  return (await res.json()) as T
}

export const api = {
  get: <T>(path: string, params?: Params, signal?: AbortSignal) =>
    request<T>('GET', path, { params, signal }),
  post: <T>(path: string, body?: unknown, signal?: AbortSignal) =>
    request<T>('POST', path, { body, signal }),
  patch: <T>(path: string, body?: unknown, signal?: AbortSignal) =>
    request<T>('PATCH', path, { body, signal }),
  del: <T = void>(path: string, signal?: AbortSignal) => request<T>('DELETE', path, { signal }),
}
