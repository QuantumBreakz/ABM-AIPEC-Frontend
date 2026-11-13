import { useQuery } from '@tanstack/react-query'
import { api } from '../client'
import { keys } from '../keys'
import type { HistoryEntry } from '../types'

/** The change log of one company, newest first. */
export function useHistory(id: string | undefined) {
  return useQuery({
    queryKey: keys.history(id),
    queryFn: ({ signal }) => api.get<HistoryEntry[]>(`/companies/${id}/history`, undefined, signal),
    enabled: !!id,
  })
}
