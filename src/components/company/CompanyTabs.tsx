import { NavLink } from 'react-router'
import { COMPANY_TABS, type CompanyTabKey, tabPath } from '@/lib/companyTabs'
import { cn } from '@/lib/utils'

/** Tabs are real links, so each one has its own address that can be shared and reloaded. */
export function CompanyTabs({
  id,
  counts,
}: {
  id: string
  /** Small numbers shown after a tab name, for example { contacts: 3 }. */
  counts?: Partial<Record<CompanyTabKey, number>>
}) {
  return (
    <nav aria-label="Company sections" className="mb-6 border-b border-border">
      <ul className="-mb-px flex gap-1 overflow-x-auto">
        {COMPANY_TABS.map((tab) => (
          <li key={tab.key}>
            <NavLink
              to={tabPath(id, tab.key)}
              end
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-2 whitespace-nowrap border-b-2 px-4 py-2.5 text-sm font-medium transition-colors',
                  isActive
                    ? 'border-primary text-foreground font-semibold'
                    : 'border-transparent text-muted-foreground hover:border-border-strong hover:text-foreground',
                )
              }
            >
              {tab.label}
              {counts?.[tab.key] !== undefined && (
                <>
                  {/* a real space, so it is read aloud as "Contacts 3" */}{' '}
                  <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-semibold tabular-nums text-foreground">
                    {counts[tab.key]}
                  </span>
                </>
              )}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  )
}
