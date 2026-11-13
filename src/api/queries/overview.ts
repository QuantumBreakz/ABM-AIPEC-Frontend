import { useQuery } from '@tanstack/react-query'
import { api } from '../client'
import { keys } from '../keys'
import type { Overview } from '../types'

/** Totals and per-step progress for one edition. Waits until an edition is chosen. */
export function useOverview(edition: number | undefined) {
  return useQuery({
    queryKey: keys.overview(edition),
    queryFn: ({ signal }) => api.get<Overview>('/stats/overview', { edition }, signal),
    enabled: edition !== undefined,
  })
}
