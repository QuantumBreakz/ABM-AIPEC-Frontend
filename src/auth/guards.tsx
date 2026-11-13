import { LockKeyhole } from 'lucide-react'
import { Link, Navigate, Outlet, useLocation } from 'react-router'
import { ErrorState } from '@/components/ErrorState'
import { Skeleton } from '@/components/Skeleton'
import { Button } from '@/components/ui/button'
import { loginUrl } from '@/lib/nav'
import type { Role } from '@/api/types'
import { useAuth } from './auth-context'

/** Everything below this needs a signed-in user. Signed-out visitors go to /login and come back. */
export function RequireAuth() {
  const { user, isLoading, error, retry } = useAuth()
  const location = useLocation()

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center" role="status">
        <span className="sr-only">Loading…</span>
        <Skeleton className="h-10 w-48" />
      </div>
    )
  }
  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <ErrorState error={error} onRetry={retry} />
      </div>
    )
  }
  if (!user) return <Navigate to={loginUrl(location.pathname + location.search)} replace />
  return <Outlet />
}

/** A friendly "no access" page. The backend checks the role too; this is only the polite part. */
export function Forbidden() {
  return (
    <div className="flex flex-col items-center justify-center gap-3 px-6 py-24 text-center">
      <div className="flex size-11 items-center justify-center rounded-full bg-neutral-soft text-neutral">
        <LockKeyhole className="size-5" aria-hidden />
      </div>
      <h1 className="text-xl font-semibold">You do not have access to this page</h1>
      <p className="max-w-sm text-muted-foreground">
        This area is only for administrators. Ask an admin if you need it.
      </p>
      <Button asChild variant="secondary">
        <Link to="/">Back to overview</Link>
      </Button>
    </div>
  )
}

export function RequireRole({ role }: { role: Role }) {
  const { user } = useAuth()
  if (user?.role !== role) return <Forbidden />
  return <Outlet />
}
