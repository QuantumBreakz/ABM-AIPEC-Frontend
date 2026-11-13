import { Outlet } from 'react-router'
import { AuthProvider } from '@/auth/AuthProvider'
import { WakingBanner } from './WakingBanner'

/** Top of every page: the auth state plus the "server is waking up" banner. */
export function Root() {
  return (
    <AuthProvider>
      <WakingBanner />
      <Outlet />
    </AuthProvider>
  )
}
