import { QueryClient } from '@tanstack/react-query'
import { ApiError } from './client'

/** Don't retry client mistakes (4xx); retry transient failures up to twice. */
function shouldRetry(failureCount: number, error: unknown) {
  if (error instanceof ApiError && error.status >= 400 && error.status < 500) return false
  return failureCount < 2
}

export function createQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: shouldRetry,
        staleTime: 30_000, // lists stay fresh for 30 s
        refetchOnWindowFocus: false,
      },
      mutations: { retry: false },
    },
  })
}
