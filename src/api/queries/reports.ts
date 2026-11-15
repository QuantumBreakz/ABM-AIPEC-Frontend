import { useMutation, useQuery } from '@tanstack/react-query'
import { saveBlob } from '@/lib/download'
import { api } from '../client'
import { keys } from '../keys'
import type { GapReport } from '../types'

/** What is finished, what is stuck and why, for one edition. Waits until an edition is chosen. */
export function useGapReport(edition: number | undefined) {
  return useQuery({
    queryKey: keys.gap(edition),
    queryFn: ({ signal }) => api.get<GapReport>('/reports/gap', { edition }, signal),
    enabled: edition !== undefined,
  })
}

/** Download the blocked-records list as a CSV file. */
export function useDownloadGapCsv() {
  return useMutation({
    mutationFn: async (edition: number) => {
      const { blob, filename } = await api.download('/reports/gap.csv', { edition })
      saveBlob(blob, filename)
      return filename
    },
  })
}
