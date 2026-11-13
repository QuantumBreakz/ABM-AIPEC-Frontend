import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { isRunning } from '@/lib/runs'
import { api } from '../client'
import { keys } from '../keys'
import type { Paged, Run, RunStep } from '../types'

/** How often a screen re-reads a run that is still running. Tests make this tiny. */
export const polling = { runsMs: 5_000 }

/** The list of runs. It re-reads every 5 s while any run on the page is running. */
export function useRuns(page: number) {
  return useQuery({
    queryKey: keys.runs(page),
    queryFn: ({ signal }) => api.get<Paged<Run>>('/runs', { page }, signal),
    placeholderData: keepPreviousData,
    refetchInterval: (query) => (query.state.data?.items.some(isRunning) ? polling.runsMs : false),
  })
}

/** One run. It re-reads every 5 s while running and stops when it is paused or finished. */
export function useRun(id: string | undefined) {
  return useQuery({
    queryKey: keys.run(id),
    queryFn: ({ signal }) => api.get<Run>(`/runs/${id}`, undefined, signal),
    enabled: !!id,
    refetchInterval: (query) =>
      query.state.data && isRunning(query.state.data) ? polling.runsMs : false,
  })
}

/** Start a run. Omit `steps` to run everything. A 409 means another run is already going. */
export function useStartRun() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: { edition: number; steps?: RunStep[] }) => api.post<Run>('/runs', input),
    onSuccess: (run) => {
      queryClient.setQueryData(keys.run(run.id), run)
      void queryClient.invalidateQueries({ queryKey: keys.runsAll })
    },
  })
}

function useRunAction(action: 'pause' | 'resume') {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => api.post<Run>(`/runs/${id}/${action}`),
    onSuccess: (run) => {
      queryClient.setQueryData(keys.run(run.id), run)
      void queryClient.invalidateQueries({ queryKey: keys.runsAll })
    },
  })
}

export const usePauseRun = () => useRunAction('pause')
export const useResumeRun = () => useRunAction('resume')
