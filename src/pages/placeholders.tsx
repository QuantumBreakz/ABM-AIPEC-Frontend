import { Link } from 'react-router'
import { Button } from '@/components/ui/button'
import { ComingSoon } from './ComingSoon'

export const AiReviewPage = () => (
  <ComingSoon title="AI review" description="Review and approve generated outreach drafts." />
)
export const ExportsPage = () => (
  <ComingSoon title="Exports" description="Download company, contact, and outreach CSVs." />
)
export const GapReportPage = () => (
  <ComingSoon title="Gap report" description="Stage completion and blocker summary." />
)
export const AdminUsersPage = () => (
  <ComingSoon title="Users" description="Manage workspace accounts and roles." />
)
export const AdminProvidersPage = () => (
  <ComingSoon title="Providers" description="Configure API keys and integrations." />
)
export const AdminSuppressionsPage = () => (
  <ComingSoon title="Suppressions" description="Manage opt-out emails and domains." />
)

export function NotFoundPage() {
  return (
    <div className="flex flex-col items-center justify-center gap-3 px-6 py-24 text-center">
      <p className="text-5xl font-semibold tracking-tight text-muted-foreground">404</p>
      <h1 className="text-xl font-semibold">We could not find that page</h1>
      <p className="max-w-sm text-sm text-muted-foreground">
        This URL may be outdated or mistyped.
      </p>
      <Button asChild variant="secondary">
        <Link to="/">Back to overview</Link>
      </Button>
    </div>
  )
}
