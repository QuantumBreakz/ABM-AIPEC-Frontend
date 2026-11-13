import { Link } from 'react-router'
import { useCompany } from '@/api/queries/companies'
import type { ReviewItem, ReviewType } from '@/api/types'
import { Drawer } from '@/components/Drawer'
import { ErrorState } from '@/components/ErrorState'
import { Skeleton } from '@/components/Skeleton'
import { DuplicateReview } from './DuplicateReview'
import { GenericReview } from './GenericReview'
import { WebsiteReview } from './WebsiteReview'

/** The panel that opens when a queue row is clicked. What it shows depends on the kind of review. */
export function ReviewDrawer({
  type,
  companyId,
  item,
  onClose,
}: {
  type: ReviewType
  /** The company being reviewed, or undefined when the drawer is closed. */
  companyId: string | undefined
  /** The queue row, when it is on the page that is showing (a deep link may not have it). */
  item: ReviewItem | undefined
  onClose: () => void
}) {
  const company = useCompany(companyId)

  return (
    <Drawer
      open={!!companyId}
      onOpenChange={(open) => !open && onClose()}
      title={company.data?.name ?? item?.companyName ?? 'Review item'}
      description={item?.reason}
      wide={type === 'duplicate'}
    >
      {company.isPending ? (
        <div role="status" aria-busy="true" className="flex flex-col gap-3">
          <span className="sr-only">Loading…</span>
          <Skeleton className="h-24" />
          <Skeleton className="h-40" />
        </div>
      ) : company.error || !company.data ? (
        <ErrorState error={company.error} onRetry={() => void company.refetch()} />
      ) : (
        <div className="flex flex-col gap-5">
          <p className="text-[13px]">
            <Link
              to={`/companies/${company.data.id}`}
              className="font-medium text-primary underline-offset-2 hover:underline"
            >
              Open the full company page
            </Link>
          </p>
          {type === 'website' ? (
            <WebsiteReview company={company.data} onResolved={onClose} />
          ) : type === 'duplicate' ? (
            <DuplicateReview company={company.data} onResolved={onClose} />
          ) : (
            <GenericReview type={type} item={item} company={company.data} />
          )}
        </div>
      )}
    </Drawer>
  )
}
