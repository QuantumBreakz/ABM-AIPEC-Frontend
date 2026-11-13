import { type QueryClient, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '../client'
import { keys } from '../keys'
import type { Contact, ContactInput } from '../types'

/** A contact changed: the company page, its history, the lists and the review queues are out of date. */
export function refreshAfterContactChange(queryClient: QueryClient, companyId: string) {
  void queryClient.invalidateQueries({ queryKey: keys.company(companyId) })
  void queryClient.invalidateQueries({ queryKey: keys.history(companyId) })
  void queryClient.invalidateQueries({ queryKey: ['companies'] })
  void queryClient.invalidateQueries({ queryKey: keys.reviewAll })
  void queryClient.invalidateQueries({ queryKey: keys.reviewCounts })
}

/**
 * Add a contact. The server treats the same name as the same person, so saving twice updates the
 * existing contact instead of adding a second one.
 */
export function useCreateContact(companyId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: ContactInput) =>
      api.post<Contact>(`/companies/${companyId}/contacts`, input),
    onSuccess: () => refreshAfterContactChange(queryClient, companyId),
  })
}

export function useUpdateContact(companyId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: { id: string; changes: Partial<ContactInput> }) =>
      api.patch<Contact>(`/contacts/${input.id}`, input.changes),
    onSuccess: () => refreshAfterContactChange(queryClient, companyId),
  })
}

/** Admin only on the server. Deleting a contact also deletes their emails and drafts. */
export function useDeleteContact(companyId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => api.del(`/contacts/${id}`),
    onSuccess: () => refreshAfterContactChange(queryClient, companyId),
  })
}
