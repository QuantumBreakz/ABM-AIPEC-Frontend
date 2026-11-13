import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import type { FilterValues } from '@/lib/filters'
import { applyPatch, type CompanyPatch } from '@/lib/patch'
import { ApiError, api } from '../client'
import { keys } from '../keys'
import type { Company, CompanyListItem, Paged, StepKey, StepStatus } from '../types'

export const COMPANY_PAGE_SIZE = 50

/**
 * One page of the company list. `filters` come straight from the URL (see useUrlFilters).
 * The previous page stays on screen while the next one loads, so paging never flashes empty.
 */
export function useCompanies(
  filters: FilterValues,
  page: number,
  sort: string | undefined,
  enabled = true,
) {
  const params = { ...filters, page, pageSize: COMPANY_PAGE_SIZE, sort }
  return useQuery({
    queryKey: keys.companies(params),
    queryFn: ({ signal }) => api.get<Paged<CompanyListItem>>('/companies', params, signal),
    placeholderData: keepPreviousData,
    enabled,
  })
}

/** One company with everything we know about it. */
export function useCompany(id: string | undefined) {
  return useQuery({
    queryKey: keys.company(id),
    queryFn: ({ signal }) => api.get<Company>(`/companies/${id}`, undefined, signal),
    enabled: !!id,
  })
}

/**
 * Edit fields of a company. The screen changes at once ("optimistic"), the server confirms a
 * moment later, and if the server refuses the old value comes back with a message.
 */
export function useUpdateCompany(id: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (patch: CompanyPatch) => api.patch<Company>(`/companies/${id}`, patch),
    onMutate: async (patch) => {
      // Stop any refresh in flight, so it cannot overwrite the optimistic value.
      await queryClient.cancelQueries({ queryKey: keys.company(id) })
      const previous = queryClient.getQueryData<Company>(keys.company(id))
      if (previous) queryClient.setQueryData(keys.company(id), applyPatch(previous, patch))
      return { previous }
    },
    onError: (error, _patch, context) => {
      if (context?.previous) queryClient.setQueryData(keys.company(id), context.previous)
      const why = error instanceof ApiError ? error.message : 'Something went wrong.'
      toast.error(`The change was not saved and has been undone. ${why}`)
    },
    onSuccess: (company) => queryClient.setQueryData(keys.company(id), company),
    onSettled: () => {
      // The change log and the lists have new information now.
      void queryClient.invalidateQueries({ queryKey: keys.history(id) })
      void queryClient.invalidateQueries({ queryKey: ['companies'] })
    },
  })
}

/** Set a step's status by hand. A reason is required, and the change is recorded in the history. */
export function useOverrideStep(id: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: { step: StepKey; status: StepStatus; reason: string }) =>
      api.post<Company>(`/companies/${id}/steps/${input.step}`, {
        status: input.status,
        reason: input.reason,
      }),
    onSuccess: (company) => {
      queryClient.setQueryData(keys.company(id), company)
      void queryClient.invalidateQueries({ queryKey: keys.history(id) })
      void queryClient.invalidateQueries({ queryKey: ['companies'] })
      void queryClient.invalidateQueries({ queryKey: ['review-counts'] })
    },
  })
}
