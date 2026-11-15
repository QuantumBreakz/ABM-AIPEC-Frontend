import { useQuery } from '@tanstack/react-query'
import { api } from '../client'
import { keys } from '../keys'
import type { Providers } from '../types'

/** Which outside tools are switched on (email checker, ContactOut, language model). */
export function useProviders() {
  return useQuery({
    queryKey: keys.providers,
    queryFn: ({ signal }) => api.get<Providers>('/settings/providers', undefined, signal),
    staleTime: 60_000,
  })
}
