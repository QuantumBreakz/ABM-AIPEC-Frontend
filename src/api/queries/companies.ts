import { keepPreviousData, useQuery } from '@tanstack/react-query'
import type { FilterValues } from '@/lib/filters'
import { api } from '../client'
import { keys } from '../keys'
import type { CompanyListItem, Paged } from '../types'

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
