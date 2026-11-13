import { ArrowLeft, Copy, Globe, Layers } from 'lucide-react'
import { Link } from 'react-router'
import { useCompany } from '@/api/queries/companies'
import type { Company } from '@/api/types'
import { NotAvailable } from '@/components/NotAvailable'
import { ProgressBar } from '@/components/ProgressBar'
import { SourceLink } from '@/components/SourceLink'
import { Button } from '@/components/ui/button'
import { usePageTitle } from '@/lib/usePageTitle'

/** Says "this may be the same company as X" and links to the other record. */
function DuplicateBanner({ otherId }: { otherId: string }) {
  const other = useCompany(otherId)
  const name = other.data?.name ?? otherId
  return (
    <div
      role="note"
      className="mb-6 flex items-start gap-3 rounded-xl border border-warning/30 bg-warning-soft px-4 py-3.5 text-warning-ink shadow-xs"
    >
      <Copy className="mt-0.5 size-4 shrink-0" aria-hidden />
      <div className="text-sm">
        <p className="font-semibold">This record may be a duplicate.</p>
        <p className="mt-0.5">
          It looks like the same company as{' '}
          <Link to={`/companies/${otherId}`} className="font-semibold underline underline-offset-2">
            {name}
          </Link>
          . A reviewer decides whether to merge them in the{' '}
          <Link to="/review/duplicate" className="font-semibold underline underline-offset-2">
            duplicate review queue
          </Link>
          .
        </p>
      </div>
    </div>
  )
}

/** Name, where the company's website is, how complete the research is, and a duplicate warning. */
export function CompanyHeader({ company }: { company: Company }) {
  usePageTitle(company.name)
  const websiteStep = company.stages.website
  const otherNames = company.originalNames.filter((n) => n !== company.name)

  return (
    <>
      <Button asChild variant="ghost" size="sm" className="-ml-2 mb-3">
        <Link to="/companies">
          <ArrowLeft className="size-4" aria-hidden />
          All companies
        </Link>
      </Button>

      <header className="card-elevated mb-6 flex flex-wrap items-start justify-between gap-6 p-5 sm:p-6">
        <div className="min-w-0 flex-1">
          <h1 className="text-[1.625rem] font-semibold leading-tight tracking-[-0.025em] text-foreground">
            {company.name}
          </h1>
          <div className="mt-2.5 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-muted-foreground">
            <span className="inline-flex items-center gap-1.5">
              <Globe className="size-3.5 text-muted-foreground" aria-hidden />
              Website:{' '}
              {company.website.url ? (
                <SourceLink href={company.website.url} />
              ) : (
                <NotAvailable
                  reason={
                    websiteStep.status === 'completed'
                      ? 'No official website was found'
                      : (websiteStep.reason ?? 'Not found yet')
                  }
                />
              )}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Layers className="size-3.5 text-muted-foreground" aria-hidden />
              {company.editions.length === 1 ? 'Edition' : 'Editions'}:{' '}
              <span className="font-medium text-foreground">
                {company.editions.map((e) => e.edition).join(', ')}
              </span>
            </span>
          </div>
          {otherNames.length > 0 && (
            <p className="mt-2 text-[0.8125rem] text-muted-foreground">
              Also listed as{' '}
              <span className="font-medium text-foreground/85">{otherNames.join(', ')}</span>
            </p>
          )}
        </div>
        <div className="w-full rounded-xl border border-border/80 bg-muted/35 p-3.5 sm:w-64">
          <p className="mb-1.5 text-[0.75rem] font-semibold uppercase tracking-[0.05em] text-muted-foreground">
            Research complete
          </p>
          <ProgressBar value={company.completeness} label="Research completeness" wide />
        </div>
      </header>

      {company.duplicateOf && <DuplicateBanner otherId={company.duplicateOf} />}
    </>
  )
}
