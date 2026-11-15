import { type QueryClient, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '../client'
import { keys } from '../keys'
import type { AiPatch, CompanyAi, ContactAi } from '../types'

/** A draft changed: the company, its history, the lists and the AI queue are out of date. */
function refreshAfterAiChange(queryClient: QueryClient, companyId: string) {
  void queryClient.invalidateQueries({ queryKey: keys.company(companyId) })
  void queryClient.invalidateQueries({ queryKey: keys.history(companyId) })
  void queryClient.invalidateQueries({ queryKey: ['companies'] })
  void queryClient.invalidateQueries({ queryKey: keys.reviewAll })
  void queryClient.invalidateQueries({ queryKey: keys.reviewCounts })
}

/** Save, approve or reject the company draft. The approved copy changes only when you approve again. */
export function useCompanyAiAction(companyId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (patch: AiPatch) => api.patch<CompanyAi>(`/companies/${companyId}/ai`, patch),
    onSuccess: () => refreshAfterAiChange(queryClient, companyId),
  })
}

export function useContactAiAction(companyId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: { contactId: string; patch: AiPatch }) =>
      api.patch<ContactAi>(`/contacts/${input.contactId}/ai`, input.patch),
    onSuccess: () => refreshAfterAiChange(queryClient, companyId),
  })
}

/** Ask for a new draft. The server answers 202 at once; the draft shows up on a later read. */
export function useRegenerate(companyId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (target: { kind: 'company' } | { kind: 'contact'; contactId: string }) =>
      target.kind === 'company'
        ? api.post<{ queued: boolean }>(`/companies/${companyId}/ai/regenerate`)
        : api.post<{ queued: boolean }>(`/contacts/${target.contactId}/ai/regenerate`),
    onSuccess: () => refreshAfterAiChange(queryClient, companyId),
  })
}
