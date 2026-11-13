import { NavLink } from 'react-router'
import { useReviewCounts } from '@/api/queries/review'
import { REVIEW_TYPES } from '@/api/types'
import { REVIEW_LABEL } from '@/lib/review'
import { cn } from '@/lib/utils'

/** One tab per kind of review, each with how many items are waiting. Tabs are real links. */
export function ReviewTabs() {
  const counts = useReviewCounts()
  return (
    <nav aria-label="Review queues" className="mb-6 border-b border-border">
      <ul className="-mb-px flex gap-1 overflow-x-auto">
        {REVIEW_TYPES.map((type) => (
          <li key={type}>
            <NavLink
              to={`/review/${type}`}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-2 whitespace-nowrap border-b-2 px-4 py-2.5 text-sm font-medium transition-colors',
                  isActive
                    ? 'border-primary text-foreground'
                    : 'border-transparent text-muted-foreground hover:border-border-strong hover:text-foreground',
                )
              }
            >
              {REVIEW_LABEL[type]}
              {counts.data && (
                <>
                  {/* a real space, so it is read aloud as "Website 12" */}{' '}
                  <span className="rounded-full bg-muted px-1.5 text-xs tabular-nums text-muted-foreground">
                    {counts.data[type]}
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
