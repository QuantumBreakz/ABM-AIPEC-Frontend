import { useQuery, useQueryClient } from '@tanstack/react-query'
import { type ReactNode, useCallback, useEffect, useMemo } from 'react'
import { useLocation, useNavigate } from 'react-router'
import { ApiError, api, setUnauthorizedHandler } from '@/api/client'
import { keys } from '@/api/keys'
import type { User } from '@/api/types'
import { loginUrl } from '@/lib/nav'
import { AuthContext, type AuthState } from './auth-context'

/** Asks the server who is signed in (once) and shares the answer with the whole app. */
export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  const location = useLocation()

  const { data, isPending, error, refetch } = useQuery({
    queryKey: keys.me,
    queryFn: async () => {
      try {
        return await api.get<User>('/auth/me')
      } catch (error) {
        // 401 simply means "not signed in", which is a normal answer here.
        if (error instanceof ApiError && error.status === 401) return null
        throw error
      }
    },
    staleTime: Number.POSITIVE_INFINITY,
    retry: false,
  })

  // If the session ends while the app is open, any API call that gets a 401 lands here:
  // forget the user and go to the login page, remembering where they were.
  const { pathname, search } = location
  useEffect(() => {
    setUnauthorizedHandler(() => {
      queryClient.setQueryData(keys.me, null)
      navigate(loginUrl(pathname + search), { replace: true })
    })
  }, [queryClient, navigate, pathname, search])

  const setUser = useCallback(
    (user: User) => queryClient.setQueryData(keys.me, user),
    [queryClient],
  )

  const signOut = useCallback(async () => {
    try {
      await api.post('/auth/logout')
    } catch {
      // even if the server is unreachable, leave this browser signed out
    }
    queryClient.clear()
    queryClient.setQueryData(keys.me, null)
    navigate('/login', { replace: true })
  }, [queryClient, navigate])

  const value = useMemo<AuthState>(
    () => ({
      user: data ?? null,
      isLoading: isPending,
      error,
      retry: () => void refetch(),
      setUser,
      signOut,
    }),
    [data, isPending, error, refetch, setUser, signOut],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
