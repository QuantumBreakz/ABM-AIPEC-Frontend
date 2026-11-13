import {
  keepPreviousData,
  type QueryClient,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query'
import { api } from '../client'
import { keys } from '../keys'
import type { Company, Paged, ReviewItem, ReviewType } from '../types'

/** How many items wait in each review queue (drives the sidebar badge and the tab numbers). */
export function useReviewCounts() {
  return useQuery({
    queryKey: keys.reviewCounts,
    queryFn: ({ signal }) =>
      api.get<Record<ReviewType, number>>('/review/counts', undefined, signal),
    refetchInterval: 60_000,
  })
}

/** One page of one review queue. The previous page stays visible while the next one loads. */
export function useReview(type: ReviewType, page: number) {
  return useQuery({
    queryKey: keys.review(type, page),
    queryFn: ({ signal }) => api.get<Paged<ReviewItem>>('/review', { type, page }, signal),
    placeholderData: keepPreviousData,
  })
}

/** After anything is resolved, the queue, its counts and the affected companies are out of date. */
export function refreshAfterReview(queryClient: QueryClient, companyIds: string[]) {
  void queryClient.invalidateQueries({ queryKey: keys.reviewAll })
  void queryClient.invalidateQueries({ queryKey: keys.reviewCounts })
  void queryClient.invalidateQueries({ queryKey: ['companies'] })
  for (const id of companyIds) {
    void queryClient.invalidateQueries({ queryKey: keys.company(id) })
    void queryClient.invalidateQueries({ queryKey: keys.history(id) })
  }
}

/**
 * Set a company's official website and record that its details still need researching.
 * (Partial, not Completed: we have the address but have not read the site yet.)
 */
export function useResolveWebsite(id: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (url: string) => {
      await api.patch<Company>(`/companies/${id}`, { 'website.url': url })
      return api.post<Company>(`/companies/${id}/steps/website`, {
        status: 'partial',
        reason: 'Website address set by a reviewer. Its details have not been researched yet.',
      })
    },
    onSuccess: (company) => {
      queryClient.setQueryData(keys.company(id), company)
      refreshAfterReview(queryClient, [id])
    },
  })
}

/** Merge `sourceId` into `intoId`: its contacts and editions move over and the source is removed. */
export function useMergeCompany() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: { sourceId: string; intoId: string }) =>
      api.post<Company>(`/companies/${input.sourceId}/merge`, { intoId: input.intoId }),
    onSuccess: (kept, { sourceId }) => {
      queryClient.removeQueries({ queryKey: keys.company(sourceId) })
      queryClient.setQueryData(keys.company(kept.id), kept)
      refreshAfterReview(queryClient, [kept.id])
    },
  })
}

/** Say a flagged record is a different company after all. */
export function useNotDuplicate() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => api.post<Company>(`/companies/${id}/not-duplicate`),
    onSuccess: (company) => {
      queryClient.setQueryData(keys.company(company.id), company)
      refreshAfterReview(queryClient, [company.id])
    },
  })
}
