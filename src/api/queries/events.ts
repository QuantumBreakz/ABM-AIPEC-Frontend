import { useQuery } from '@tanstack/react-query'
import { api } from '../client'
import { keys } from '../keys'
import type { Event } from '../types'

/** The exhibitions we know about (ADIPEC 2026, 2025…). Rarely changes, so it stays fresh for a while. */
export function useEvents() {
  return useQuery({
    queryKey: keys.events,
    queryFn: ({ signal }) => api.get<Event[]>('/events', undefined, signal),
    staleTime: 5 * 60_000,
  })
}
