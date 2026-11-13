import { ArrowUpRight } from 'lucide-react'
import { Link } from 'react-router'
import type { Company, ReviewItem, ReviewType } from '@/api/types'
import { DateTime } from '@/components/DateTime'
import { Button } from '@/components/ui/button'
import { REVIEW_TAB } from '@/lib/review'

const TAB_NAME = { website: 'Website', contacts: 'Contacts', ai: 'AI' } as const

/** Summary panel in the review drawer with a direct link to the corresponding company workspace tab. */
export function GenericReview({
  type,
  item,
  company,
}: {
  type: ReviewType
  item: ReviewItem | undefined
  company: Company
}) {
  const tab = REVIEW_TAB[type]
  return (
    <div className="flex flex-col gap-5">
      <dl className="grid gap-x-4 gap-y-2.5 rounded-xl border border-border bg-muted/30 p-4 text-sm sm:grid-cols-[8rem_minmax(0,1fr)]">
        <dt className="text-muted-foreground">Reason</dt>
        <dd className="text-foreground">{item?.reason ?? 'Manual check required.'}</dd>
        {item?.contactName && (
          <>
            <dt className="text-muted-foreground">Contact</dt>
            <dd className="text-foreground">{item.contactName}</dd>
          </>
        )}
        {item && (
          <>
            <dt className="text-muted-foreground">Queued</dt>
            <dd className="text-foreground">
              <DateTime value={item.since} />
            </dd>
          </>
        )}
      </dl>
      {tab && (
        <div>
          <Button asChild>
            <Link to={`/companies/${company.id}/${tab}`}>
              Open the {TAB_NAME[tab]} tab
              <ArrowUpRight className="size-4" aria-hidden />
            </Link>
          </Button>
        </div>
      )}
    </div>
  )
}
