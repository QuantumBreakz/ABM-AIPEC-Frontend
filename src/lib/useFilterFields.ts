import { useMemo } from 'react'
import { useEvents } from '@/api/queries/events'
import { COMPANY_FILTER_FIELDS, type FilterField } from './filters'

/** The company filters, with "Edition" as a dropdown of the editions we know about. */
export function useFilterFields(): { fields: FilterField[]; ready: boolean } {
  const events = useEvents()
  const fields = useMemo<FilterField[]>(() => {
    const list = events.data
    if (!list) return COMPANY_FILTER_FIELDS
    return COMPANY_FILTER_FIELDS.map((field) =>
      field.key === 'edition'
        ? {
            key: 'edition',
            label: 'Edition',
            type: 'select',
            options: list.map((e) => ({ value: String(e.edition), label: e.name })),
          }
        : field,
    )
  }, [events.data])
  return { fields, ready: !events.isPending }
}
