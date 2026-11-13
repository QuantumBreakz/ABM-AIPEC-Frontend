import { ArrowLeft, Sparkles } from 'lucide-react'
import { Link, useParams } from 'react-router'
import { useCompany } from '@/api/queries/companies'
import { AdipecTab } from '@/components/company/AdipecTab'
import { CompanyHeader } from '@/components/company/CompanyHeader'
import { CompanyTabs } from '@/components/company/CompanyTabs'
import { ContactsTab } from '@/components/company/ContactsTab'
import { HistoryTab } from '@/components/company/HistoryTab'
import { SocialsTab } from '@/components/company/SocialsTab'
import { WebsiteTab } from '@/components/company/WebsiteTab'
import { isCompanyTab } from '@/lib/companyTabs'
import { StepsPanel } from '@/components/company/StepsPanel'
import { EmptyState } from '@/components/EmptyState'
import { ErrorState } from '@/components/ErrorState'
import { Skeleton } from '@/components/Skeleton'
import { Button } from '@/components/ui/button'
import { usePageTitle } from '@/lib/usePageTitle'
import { NotFoundPage } from './placeholders'

export default function CompanyDetailPage() {
  const { id, tab } = useParams()
  const company = useCompany(id)
  usePageTitle(company.data?.name ?? 'Company')

  if (tab !== undefined && !isCompanyTab(tab)) return <NotFoundPage />
  const current = tab ?? 'adipec'

  const back = (
    <Button asChild variant="ghost" size="sm" className="-ml-2 mb-2">
      <Link to="/companies">
        <ArrowLeft className="size-4" aria-hidden />
        All companies
      </Link>
    </Button>
  )

  if (company.isPending) {
    return (
      <>
        {back}
        <div role="status" aria-busy="true" className="flex flex-col gap-4">
          <span className="sr-only">Loading company…</span>
          <Skeleton className="h-10 w-72" />
          <Skeleton className="h-48" />
          <Skeleton className="h-64" />
        </div>
      </>
    )
  }

  if (company.error || !company.data) {
    return (
      <>
        {back}
        <div className="rounded-lg border border-border bg-surface">
          <ErrorState error={company.error} onRetry={() => void company.refetch()} />
        </div>
      </>
    )
  }

  const data = company.data
  return (
    <>
      <CompanyHeader company={data} />
      <StepsPanel companyId={data.id} stages={data.stages} />
      <CompanyTabs id={data.id} counts={{ contacts: data.contacts.length }} />

      {current === 'adipec' ? (
        <AdipecTab company={data} />
      ) : current === 'website' ? (
        <WebsiteTab company={data} />
      ) : current === 'socials' ? (
        <SocialsTab company={data} />
      ) : current === 'contacts' ? (
        <ContactsTab company={data} />
      ) : current === 'history' ? (
        <HistoryTab companyId={data.id} />
      ) : (
        <div className="card-elevated border-dashed">
          <EmptyState
            icon={Sparkles}
            title="AI drafts coming soon"
            hint="Personalized outreach messages and editorial controls will appear here."
          />
        </div>
      )}
    </>
  )
}
