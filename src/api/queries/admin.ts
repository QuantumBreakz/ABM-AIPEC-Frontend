import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '../client'
import { keys } from '../keys'
import type { Role, Suppression, User } from '../types'

/** Everyone who can sign in. Admin only on the server. */
export function useUsers() {
  return useQuery({
    queryKey: keys.users,
    queryFn: ({ signal }) => api.get<User[]>('/users', undefined, signal),
  })
}

function useUserMutation<T>(fn: (input: T) => Promise<unknown>) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: fn,
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: keys.users }),
  })
}

export const useCreateUser = () =>
  useUserMutation((input: { email: string; password: string; role: Role }) =>
    api.post<User>('/users', input),
  )

export const useUpdateUser = () =>
  useUserMutation((input: { id: string; role?: Role; password?: string }) =>
    api.patch<User>(`/users/${input.id}`, { role: input.role, password: input.password }),
  )

export const useDeleteUser = () => useUserMutation((id: string) => api.del(`/users/${id}`))

/** Emails and domains that must never be contacted or saved. */
export function useSuppressions() {
  return useQuery({
    queryKey: keys.suppressions,
    queryFn: ({ signal }) => api.get<Suppression[]>('/suppressions', undefined, signal),
  })
}

function useSuppressionMutation<T>(fn: (input: T) => Promise<unknown>) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: fn,
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: keys.suppressions }),
  })
}

export const useAddSuppression = () =>
  useSuppressionMutation((input: { value: string; reason?: string }) =>
    api.post<Suppression>('/suppressions', input),
  )

export const useDeleteSuppression = () =>
  useSuppressionMutation((id: string) => api.del(`/suppressions/${id}`))
