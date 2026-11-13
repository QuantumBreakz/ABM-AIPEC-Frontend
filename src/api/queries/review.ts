import { useQuery } from '@tanstack/react-query'
import { api } from '../client'
import { keys } from '../keys'
import type { ReviewType } from '../types'

/** How many items wait in each review queue (drives the sidebar badge). */
export function useReviewCounts() {
  return useQuery({
    queryKey: keys.reviewCounts,
    queryFn: ({ signal }) =>
      api.get<Record<ReviewType, number>>('/review/counts', undefined, signal),
    refetchInterval: 60_000,
  })
}
