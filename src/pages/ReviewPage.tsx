import { PartyPopper } from 'lucide-react'
import { Link, useParams, useSearchParams } from 'react-router'
import { useReview } from '@/api/queries/review'
import type { ReviewItem, ReviewType } from '@/api/types'
import { type Columns, DataTable } from '@/components/DataTable'
import { DateTime } from '@/components/DateTime'
import { EmptyState } from '@/components/EmptyState'
import { PageHeader } from '@/components/PageHeader'
import { ReviewDrawer } from '@/components/review/ReviewDrawer'
import { ReviewTabs } from '@/components/review/ReviewTabs'
import { isReviewType, REVIEW_DESCRIPTION, reviewKey } from '@/lib/review'
import { NotFoundPage } from './placeholders'

const columns: Columns<ReviewItem> = [
  {
    id: 'company',
    header: 'Company',
    enableHiding: false,
    cell: ({ row }) => (
      <div className="min-w-44">
        <Link
          to={`/companies/${row.original.companyId}`}
          className="font-medium underline-offset-2 hover:underline"
        >
          {row.original.companyName}
        </Link>
        {row.original.contactName && (
          <p className="text-[13px] text-muted-foreground">{row.original.contactName}</p>
        )}
      </div>
    ),
  },
  {
    id: 'reason',
    header: 'Why it is here',
    cell: ({ row }) => (
      <span className="block max-w-xl whitespace-normal">{row.original.reason}</span>
    ),
  },
  {
    id: 'since',
    header: 'Waiting since',
    cell: ({ row }) => <DateTime value={row.original.since} />,
  },
]

function Queue({ type }: { type: ReviewType }) {
  const [params, setParams] = useSearchParams()
  const rawPage = Number(params.get('page'))
  const page = Number.isInteger(rawPage) && rawPage >= 1 ? rawPage : 1
  const itemId = params.get('item') ?? undefined
  const contactId = params.get('contact') ?? undefined

  const review = useReview(type, page)
  const selected = review.data?.items.find(
    (i) => i.companyId === itemId && (i.contactId ?? undefined) === contactId,
  )

  const update = (change: (next: URLSearchParams) => void) =>
    setParams((prev) => {
      const next = new URLSearchParams(prev)
      change(next)
      return next
    })

  return (
    <>
      <p className="mb-4 max-w-3xl text-muted-foreground">{REVIEW_DESCRIPTION[type]}</p>
      <DataTable
        columns={columns}
        data={review.data?.items}
        getRowId={reviewKey}
        isLoading={review.isPending}
        isFetching={review.isFetching}
        error={review.error}
        onRetry={() => void review.refetch()}
        page={page}
        pageSize={review.data?.pageSize ?? 50}
        total={review.data?.total}
        onPageChange={(next) =>
          update((p) => {
            if (next <= 1) p.delete('page')
            else p.set('page', String(next))
          })
        }
        onRowClick={(row) =>
          update((p) => {
            p.set('item', row.companyId)
            if (row.contactId) p.set('contact', row.contactId)
            else p.delete('contact')
          })
        }
        rowLabel={(row) =>
          `Review ${row.companyName}${row.contactName ? `, ${row.contactName}` : ''}`
        }
        empty={
          <EmptyState
            icon={PartyPopper}
            title="Nothing to review here"
            hint="You are all caught up."
          />
        }
      />
      <ReviewDrawer
        type={type}
        companyId={itemId}
        item={selected}
        onClose={() =>
          update((p) => {
            p.delete('item')
            p.delete('contact')
          })
        }
      />
    </>
  )
}

export default function ReviewPage() {
  const { type } = useParams()
  if (!isReviewType(type)) return <NotFoundPage />
  return (
    <>
      <PageHeader title="Review queue" description="Items needing manual verification." />
      <ReviewTabs />
      <Queue type={type} />
    </>
  )
}
