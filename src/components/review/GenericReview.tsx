import { Link } from 'react-router'
import type { Company, ReviewItem, ReviewType } from '@/api/types'
import { DateTime } from '@/components/DateTime'
import { Button } from '@/components/ui/button'
import { REVIEW_TAB } from '@/lib/review'

/** The ticket that adds a guided way to resolve each kind of item. Until then the company page works. */
const GUIDED_BY: Partial<Record<ReviewType, string>> = {
  salesnav: 'FE-3.3',
  contacts: 'FE-3.4',
  emails: 'FE-3.4',
  ai: 'FE-4.2',
}

const TAB_NAME = { website: 'Website', contacts: 'Contacts', ai: 'AI' } as const

/** For kinds of review whose guided drawer is built later: show the item and link to where it is worked on. */
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
    <div className="flex flex-col gap-4">
      <dl className="grid gap-x-4 gap-y-2 text-sm sm:grid-cols-[8rem_minmax(0,1fr)]">
        <dt className="text-muted-foreground">Why it is here</dt>
        <dd>{item?.reason ?? 'Needs a person to look at it.'}</dd>
        {item?.contactName && (
          <>
            <dt className="text-muted-foreground">Contact</dt>
            <dd>{item.contactName}</dd>
          </>
        )}
        {item && (
          <>
            <dt className="text-muted-foreground">Waiting since</dt>
            <dd>
              <DateTime value={item.since} />
            </dd>
          </>
        )}
      </dl>
      <p className="text-[13px] text-muted-foreground">
        {GUIDED_BY[type]
          ? `A guided way to resolve this arrives with ${GUIDED_BY[type]}. For now, work on it on the company page.`
          : 'Work on this on the company page.'}
      </p>
      {tab && (
        <div>
          <Button asChild>
            <Link to={`/companies/${company.id}/${tab}`}>Open the {TAB_NAME[tab]} tab</Link>
          </Button>
        </div>
      )}
    </div>
  )
}
