import { createContext, useContext } from 'react'
import type { User } from '@/api/types'

export type AuthState = {
  /** The signed-in user, or null when signed out. */
  user: User | null
  /** True while we are still asking the server who is signed in. */
  isLoading: boolean
  /** Set when we could not find out (for example the server never woke up). */
  error: unknown
  retry: () => void
  /** Called by the login page after a successful sign-in. */
  setUser: (user: User) => void
  signOut: () => Promise<void>
}

export const AuthContext = createContext<AuthState | null>(null)

export function useAuth() {
  const value = useContext(AuthContext)
  if (!value) throw new Error('useAuth must be used inside <AuthProvider>')
  return value
}

/** The signed-in user. Only use below <RequireAuth>, where a user is guaranteed. */
export function useMe() {
  const { user } = useAuth()
  if (!user) throw new Error('useMe needs a signed-in user (is <RequireAuth> missing?)')
  return { user, isAdmin: user.role === 'admin' }
}
