import {
  Activity,
  Ban,
  Building2,
  ClipboardCheck,
  Download,
  FileBarChart,
  LayoutDashboard,
  type LucideIcon,
  PlugZap,
  Users,
} from 'lucide-react'
import { NavLink } from 'react-router'
import { useReviewCounts } from '@/api/queries/review'
import { useMe } from '@/auth/auth-context'
import { cn } from '@/lib/utils'

type Item = { to: string; label: string; icon: LucideIcon; end?: boolean; badge?: number }

function NavItem({ item, onNavigate }: { item: Item; onNavigate?: () => void }) {
  const Icon = item.icon
  return (
    <NavLink
      to={item.to}
      end={item.end}
      onClick={onNavigate}
      className={({ isActive }) =>
        cn(
          'group relative flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
          isActive
            ? 'bg-primary/10 text-primary-hover font-semibold'
            : 'text-muted-foreground hover:bg-muted/70 hover:text-foreground',
        )
      }
    >
      {({ isActive }) => (
        <>
          {isActive && (
            <span
              aria-hidden
              className="absolute left-0 top-1.5 bottom-1.5 w-[3px] rounded-r-full bg-primary"
            />
          )}
          <Icon
            className={cn(
              'size-4 shrink-0 transition-colors',
              isActive ? 'text-primary' : 'text-muted-foreground group-hover:text-foreground',
            )}
            aria-hidden
          />
          <span className="flex-1 truncate">{item.label}</span>
          {item.badge ? (
            <span
              className="rounded-full bg-primary px-2 py-0.5 text-xs font-semibold tabular-nums text-primary-foreground shadow-xs"
              aria-label={`${item.badge} waiting`}
            >
              {item.badge > 99 ? '99+' : item.badge}
            </span>
          ) : null}
        </>
      )}
    </NavLink>
  )
}

/** Main navigation. Admin links are not rendered at all for reviewers (not just disabled). */
export function Sidebar({ onNavigate }: { onNavigate?: () => void }) {
  const { isAdmin, user } = useMe()
  const counts = useReviewCounts()
  const waiting = counts.data ? Object.values(counts.data).reduce((sum, n) => sum + n, 0) : 0

  const main: Item[] = [
    { to: '/', label: 'Overview', icon: LayoutDashboard, end: true },
    { to: '/runs', label: 'Runs', icon: Activity },
    { to: '/companies', label: 'Companies', icon: Building2 },
    { to: '/review', label: 'Review', icon: ClipboardCheck, badge: waiting },
    { to: '/exports', label: 'Exports', icon: Download },
    { to: '/admin/gap-report', label: 'Gap report', icon: FileBarChart },
  ]
  const admin: Item[] = [
    { to: '/admin/users', label: 'Users', icon: Users },
    { to: '/admin/providers', label: 'Providers', icon: PlugZap },
    { to: '/admin/suppressions', label: 'Suppressions', icon: Ban },
  ]

  return (
    <div className="flex flex-1 flex-col justify-between p-3">
      <nav aria-label="Main" className="flex flex-col gap-6">
        <div>
          <p className="px-3 pb-2 text-[0.6875rem] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
            Workspace
          </p>
          <ul className="flex flex-col gap-1">
            {main.map((item) => (
              <li key={item.to}>
                <NavItem item={item} onNavigate={onNavigate} />
              </li>
            ))}
          </ul>
        </div>
        {isAdmin && (
          <div>
            <p className="px-3 pb-2 text-[0.6875rem] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
              Administration
            </p>
            <ul className="flex flex-col gap-1">
              {admin.map((item) => (
                <li key={item.to}>
                  <NavItem item={item} onNavigate={onNavigate} />
                </li>
              ))}
            </ul>
          </div>
        )}
      </nav>

      <div className="mt-6 rounded-lg border border-border/80 bg-muted/50 px-3 py-2.5 text-xs">
        <div className="flex items-center justify-between gap-2">
          <span className="font-medium text-foreground">Access role</span>
          <span className="rounded-full bg-surface px-2 py-0.5 text-[0.6875rem] font-semibold capitalize text-foreground ring-1 ring-border">
            {user.role}
          </span>
        </div>
        <p className="mt-1 truncate text-[0.75rem] text-muted-foreground">
          {import.meta.env.VITE_API_MOCK === 'true' ? 'MSW Mock Dataset' : 'Connected to Live API'}
        </p>
      </div>
    </div>
  )
}
