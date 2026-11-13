import { Link, useParams } from 'react-router'
import { Button } from '@/components/ui/button'
import { REVIEW_TYPES, type ReviewType } from '@/api/types'
import { ComingSoon } from './ComingSoon'

// Each of these is replaced by a real screen in the ticket named below.

export const CompanyDetailPage = () => <ComingSoon title="Company" ticket="FE-1.4" />
export const AiReviewPage = () => <ComingSoon title="AI review" ticket="FE-4.1" />
export const ExportsPage = () => (
  <ComingSoon
    title="Exports"
    description="Download company, contact and outreach CSVs."
    ticket="FE-4.3"
  />
)
export const GapReportPage = () => (
  <ComingSoon title="Gap report" description="What is done and what is blocked." ticket="FE-6.2" />
)
export const AdminUsersPage = () => <ComingSoon title="Users" ticket="FE-6.1" />
export const AdminProvidersPage = () => <ComingSoon title="Providers" ticket="FE-6.1" />
export const AdminSuppressionsPage = () => <ComingSoon title="Suppressions" ticket="FE-6.1" />

export function ReviewPage() {
  const { type } = useParams()
  if (!REVIEW_TYPES.includes(type as ReviewType)) return <NotFoundPage />
  return (
    <ComingSoon
      title="Review queue"
      description="Items that need a person to look at them."
      ticket="FE-2.3"
    />
  )
}

export function NotFoundPage() {
  return (
    <div className="flex flex-col items-center justify-center gap-3 px-6 py-24 text-center">
      <p className="text-5xl font-semibold tracking-tight text-muted-foreground">404</p>
      <h1 className="text-xl font-semibold">We could not find that page</h1>
      <p className="max-w-sm text-muted-foreground">
        The link may be old or mistyped. Use the menu to find what you need.
      </p>
      <Button asChild variant="secondary">
        <Link to="/">Back to overview</Link>
      </Button>
    </div>
  )
}
