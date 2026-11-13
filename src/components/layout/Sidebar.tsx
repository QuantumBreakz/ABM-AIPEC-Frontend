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
          'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
          isActive
            ? 'bg-primary/10 text-primary'
            : 'text-muted-foreground hover:bg-muted hover:text-foreground',
        )
      }
    >
      <Icon className="size-4 shrink-0" aria-hidden />
      <span className="flex-1">{item.label}</span>
      {item.badge ? (
        <span
          className="rounded-full bg-primary px-2 py-0.5 text-xs font-semibold text-primary-foreground"
          aria-label={`${item.badge} waiting`}
        >
          {item.badge > 99 ? '99+' : item.badge}
        </span>
      ) : null}
    </NavLink>
  )
}

/** Main navigation. Admin links are not rendered at all for reviewers (not just disabled). */
export function Sidebar({ onNavigate }: { onNavigate?: () => void }) {
  const { isAdmin } = useMe()
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
    <nav aria-label="Main" className="flex flex-col gap-6 p-3">
      <ul className="flex flex-col gap-0.5">
        {main.map((item) => (
          <li key={item.to}>
            <NavItem item={item} onNavigate={onNavigate} />
          </li>
        ))}
      </ul>
      {isAdmin && (
        <div>
          <p className="px-3 pb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Admin
          </p>
          <ul className="flex flex-col gap-0.5">
            {admin.map((item) => (
              <li key={item.to}>
                <NavItem item={item} onNavigate={onNavigate} />
              </li>
            ))}
          </ul>
        </div>
      )}
    </nav>
  )
}
