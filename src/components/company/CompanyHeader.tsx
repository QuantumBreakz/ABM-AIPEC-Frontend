import { ArrowLeft, Copy } from 'lucide-react'
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
      className="mb-6 flex items-start gap-3 rounded-lg border border-border bg-warning-soft px-4 py-3 text-warning-ink"
    >
      <Copy className="mt-0.5 size-4 shrink-0" aria-hidden />
      <div className="text-sm">
        <p className="font-medium">This record may be a duplicate.</p>
        <p>
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
      <Button asChild variant="ghost" size="sm" className="-ml-2 mb-2">
        <Link to="/companies">
          <ArrowLeft className="size-4" aria-hidden />
          All companies
        </Link>
      </Button>

      <header className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-2xl font-semibold tracking-tight">{company.name}</h1>
          <p className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-muted-foreground">
            <span className="flex items-center gap-1.5">
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
            <span>
              {company.editions.length === 1 ? 'Edition' : 'Editions'}:{' '}
              <span className="text-foreground">
                {company.editions.map((e) => e.edition).join(', ')}
              </span>
            </span>
          </p>
          {otherNames.length > 0 && (
            <p className="mt-1 text-[13px] text-muted-foreground">
              Also listed as {otherNames.join(', ')}
            </p>
          )}
        </div>
        <div className="w-56">
          <p className="mb-1 text-[13px] font-medium text-muted-foreground">Research complete</p>
          <ProgressBar value={company.completeness} label="Research completeness" wide />
        </div>
      </header>

      {company.duplicateOf && <DuplicateBanner otherId={company.duplicateOf} />}
    </>
  )
}
