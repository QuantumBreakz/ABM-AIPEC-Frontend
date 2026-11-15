import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '../client'
import { keys } from '../keys'
import type { ExportLogEntry, Paged } from '../types'

/** Has anyone downloaded an initial export yet? The email check is only offered after that. */
export function useHasInitialExport() {
  return useQuery({
    queryKey: ['export-log', 'has-initial'],
    queryFn: async ({ signal }) => {
      const log = await api.get<Paged<ExportLogEntry>>(
        '/exports/log',
        { page: 1, pageSize: 200 },
        signal,
      )
      return log.items.some((entry) => entry.version === 'initial')
    },
  })
}

/** Start the email check for one edition. It runs like any other run; progress shows on the page. */
export function useStartVerification() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (edition: number) =>
      api.post<{ queued: boolean }>('/verification/run', { edition }),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: keys.runsAll }),
  })
}
