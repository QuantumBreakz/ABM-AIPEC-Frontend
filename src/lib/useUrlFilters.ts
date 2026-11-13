import { useCallback, useMemo } from 'react'
import { useSearchParams } from 'react-router'
import { type FilterField, type FilterValues, filtersFromParams, filtersToParams } from './filters'

/**
 * Keeps filters, page and sort in the URL (?country=AE&page=2&sort=-name), so a link can be
 * shared, a refresh keeps the same results and the browser Back button works.
 * `fields` must be a stable array (define it at module level).
 */
export function useUrlFilters(fields: FilterField[]) {
  const [params, setParams] = useSearchParams()

  const filters = useMemo(() => filtersFromParams(params, fields), [params, fields])

  const setFilters = useCallback(
    (values: FilterValues) => setParams((prev) => filtersToParams(values, fields, prev)),
    [fields, setParams],
  )

  const clearFilters = useCallback(
    () => setParams((prev) => filtersToParams({}, fields, prev)),
    [fields, setParams],
  )

  const rawPage = Number(params.get('page'))
  const page = Number.isInteger(rawPage) && rawPage >= 1 ? rawPage : 1

  const setPage = useCallback(
    (next: number) =>
      setParams((prev) => {
        const out = new URLSearchParams(prev)
        if (next <= 1) out.delete('page')
        else out.set('page', String(next))
        return out
      }),
    [setParams],
  )

  const sort = params.get('sort') ?? undefined

  const setSort = useCallback(
    (next: string | undefined) =>
      setParams((prev) => {
        const out = new URLSearchParams(prev)
        if (next) out.set('sort', next)
        else out.delete('sort')
        out.delete('page')
        return out
      }),
    [setParams],
  )

  return { filters, setFilters, clearFilters, page, setPage, sort, setSort }
}
