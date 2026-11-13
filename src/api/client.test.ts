import { renderHook } from '@testing-library/react'
import { ApiError, api, apiUrl, configureClient, setUnauthorizedHandler } from './client'
import { createQueryClient } from './queryClient'
import { resetWaking, useWaking } from './waking'

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })

const html = (status = 200) =>
  new Response('<html>Waking up…</html>', { status, headers: { 'Content-Type': 'text/html' } })

const fetchMock = vi.fn<typeof fetch>()

beforeEach(() => {
  vi.stubGlobal('fetch', fetchMock)
  configureClient({ base: '/api', retryIntervalMs: 3_000, wakeTimeoutMs: 90_000 })
  resetWaking()
})

afterEach(() => {
  fetchMock.mockReset()
  vi.useRealTimers()
  vi.unstubAllGlobals()
})

describe('apiUrl', () => {
  it('adds the base and skips empty params', () => {
    expect(apiUrl('/companies', { q: 'oil', page: 2, country: undefined, x: '', ok: false })).toBe(
      '/api/companies?q=oil&page=2&ok=false',
    )
  })
})

describe('requests', () => {
  it('sends the cookie and parses JSON', async () => {
    fetchMock.mockResolvedValueOnce(json({ id: '1' }))
    const result = await api.get<{ id: string }>('/companies/1')
    expect(result).toEqual({ id: '1' })
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit]
    expect(url).toBe('/api/companies/1')
    expect(init.credentials).toBe('include')
  })

  it('sends a JSON body', async () => {
    fetchMock.mockResolvedValueOnce(json({ ok: true }))
    await api.post('/auth/login', { email: 'a@example.com', password: 'x' })
    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit]
    expect(init.method).toBe('POST')
    expect(init.body).toBe(JSON.stringify({ email: 'a@example.com', password: 'x' }))
  })

  it('returns undefined for 204', async () => {
    fetchMock.mockResolvedValueOnce(new Response(null, { status: 204 }))
    await expect(api.del('/contacts/1')).resolves.toBeUndefined()
  })
})

describe('errors', () => {
  it('parses the contract error shape', async () => {
    fetchMock.mockResolvedValueOnce(
      json(
        { error: { code: 'conflict', message: 'A run is already active', details: { id: 'r1' } } },
        409,
      ),
    )
    const error = await api.post('/runs', {}).catch((e) => e)
    expect(error).toBeInstanceOf(ApiError)
    expect(error).toMatchObject({
      status: 409,
      code: 'conflict',
      message: 'A run is already active',
      details: { id: 'r1' },
    })
  })

  it('falls back to a generic error when the body is not JSON', async () => {
    fetchMock.mockResolvedValueOnce(new Response('oops', { status: 404 }))
    const error = await api.get('/nope').catch((e) => e)
    expect(error).toMatchObject({ status: 404, code: 'not_found' })
  })
})

describe('401 handling', () => {
  it('calls the unauthorized handler', async () => {
    const handler = vi.fn()
    setUnauthorizedHandler(handler)
    fetchMock.mockResolvedValueOnce(json({ error: { code: 'unauthorized', message: 'No' } }, 401))
    await expect(api.get('/companies')).rejects.toMatchObject({ status: 401 })
    expect(handler).toHaveBeenCalledOnce()
  })

  it('does not redirect when login itself fails', async () => {
    const handler = vi.fn()
    setUnauthorizedHandler(handler)
    fetchMock.mockResolvedValueOnce(json({ error: { code: 'unauthorized', message: 'Bad' } }, 401))
    await expect(api.post('/auth/login', {})).rejects.toMatchObject({ status: 401 })
    expect(handler).not.toHaveBeenCalled()
  })
})

describe('waking retry', () => {
  beforeEach(() => vi.useFakeTimers())

  it('retries 503 until the server answers, showing the banner meanwhile', async () => {
    const waking = renderHook(() => useWaking())
    fetchMock
      .mockResolvedValueOnce(new Response(null, { status: 503 }))
      .mockResolvedValueOnce(new Response(null, { status: 502 }))
      .mockResolvedValueOnce(json({ ok: true }))

    const promise = api.get<{ ok: boolean }>('/health')
    await vi.advanceTimersByTimeAsync(0)
    expect(waking.result.current).toBe(true)

    await vi.advanceTimersByTimeAsync(3_000)
    await vi.advanceTimersByTimeAsync(3_000)
    await expect(promise).resolves.toEqual({ ok: true })
    expect(fetchMock).toHaveBeenCalledTimes(3)
    expect(waking.result.current).toBe(false)
  })

  it('retries when an HTML page comes back instead of JSON', async () => {
    fetchMock.mockResolvedValueOnce(html()).mockResolvedValueOnce(json({ ok: true }))
    const promise = api.get('/companies')
    await vi.advanceTimersByTimeAsync(3_000)
    await expect(promise).resolves.toEqual({ ok: true })
  })

  it('retries network errors', async () => {
    fetchMock
      .mockRejectedValueOnce(new TypeError('Failed to fetch'))
      .mockResolvedValueOnce(json({}))
    const promise = api.get('/companies')
    await vi.advanceTimersByTimeAsync(3_000)
    await expect(promise).resolves.toEqual({})
  })

  it('gives up after 90 seconds', async () => {
    fetchMock.mockImplementation(() => Promise.resolve(new Response(null, { status: 503 })))
    const waking = renderHook(() => useWaking())
    const assertion = expect(api.get('/companies')).rejects.toMatchObject({
      status: 503,
      code: 'unavailable',
    })
    await vi.advanceTimersByTimeAsync(95_000)
    await assertion
    expect(waking.result.current).toBe(false)
    // ~30 attempts, not infinite
    expect(fetchMock.mock.calls.length).toBeGreaterThan(20)
    expect(fetchMock.mock.calls.length).toBeLessThan(40)
  })

  it('does not retry normal 4xx errors', async () => {
    fetchMock.mockResolvedValueOnce(json({ error: { code: 'not_found', message: 'Gone' } }, 404))
    await expect(api.get('/companies/x')).rejects.toMatchObject({ status: 404 })
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })
})

describe('query client defaults', () => {
  it('does not retry 4xx and uses a 30 s stale time', () => {
    const client = createQueryClient()
    const defaults = client.getDefaultOptions().queries
    expect(defaults?.staleTime).toBe(30_000)
    const retry = defaults?.retry as (count: number, error: unknown) => boolean
    expect(retry(0, new ApiError(404, 'not_found', 'x'))).toBe(false)
    expect(retry(0, new ApiError(500, 'internal', 'x'))).toBe(true)
    expect(retry(2, new ApiError(500, 'internal', 'x'))).toBe(false)
  })
})
