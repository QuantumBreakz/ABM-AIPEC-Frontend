import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { saveBlob } from '@/lib/download'
import type { FilterValues } from '@/lib/filters'
import { api } from '../client'
import type { ExportKind, ExportLogEntry, Paged } from '../types'

export type ExportVersion = 'initial' | 'final'

const exportKeys = {
  count: (kind: ExportKind, filters: object) => ['export-count', kind, filters] as const,
  log: (page: number) => ['export-log', page] as const,
  logAll: ['export-log'] as const,
}

/** How many rows a file would have for these filters. Updates as the filters change. */
export function useExportCount(kind: ExportKind, filters: FilterValues) {
  return useQuery({
    queryKey: exportKeys.count(kind, filters),
    queryFn: ({ signal }) => api.get<{ rows: number }>(`/exports/${kind}/count`, filters, signal),
    placeholderData: keepPreviousData,
  })
}

export const EXPORT_LOG_PAGE_SIZE = 10

/** Who exported what and when, newest first. */
export function useExportLog(page: number) {
  return useQuery({
    queryKey: exportKeys.log(page),
    queryFn: ({ signal }) =>
      api.get<Paged<ExportLogEntry>>(
        '/exports/log',
        { page, pageSize: EXPORT_LOG_PAGE_SIZE },
        signal,
      ),
    placeholderData: keepPreviousData,
  })
}

/** Download a file and save it. Downloading is recorded in the export log by the server. */
export function useDownloadExport() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (input: {
      kind: ExportKind
      version: ExportVersion
      filters: FilterValues
    }) => {
      const { blob, filename } = await api.download(`/exports/${input.kind}.csv`, {
        ...input.filters,
        version: input.version,
      })
      saveBlob(blob, filename)
      return filename
    },
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: exportKeys.logAll }),
  })
}
