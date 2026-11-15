import { ArrowUpRight, CircleCheck, Plus } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'
import { ApiError } from '@/api/client'
import { useOverrideStep } from '@/api/queries/companies'
import type { Company } from '@/api/types'
import { SalesNavCard } from '@/components/company/SalesNavCard'
import { ContactForm } from '@/components/contacts/ContactForm'
import { NotAvailable } from '@/components/NotAvailable'
import { SourceLink } from '@/components/SourceLink'
import { StatusBadge } from '@/components/StatusBadge'
import { Button } from '@/components/ui/button'
import { fullName } from '@/lib/contacts'
import { shortUrl } from '@/lib/format'

function Step({ n, title, children }: { n: number; title: string; children: React.ReactNode }) {
  return (
    <section aria-label={title} className="flex flex-col gap-3">
      <h3 className="flex items-center gap-2 text-sm font-semibold">
        <span
          aria-hidden
          className="grid size-5 place-items-center rounded-full bg-muted text-xs font-semibold text-foreground"
        >
          {n}
        </span>
        {title}
      </h3>
      {children}
    </section>
  )
}

/**
 * Work through one company in Sales Navigator by hand: open the search, note the account page,
 * add the decision-makers you find, say how complete the list is, then mark the steps done.
 * Nothing here talks to LinkedIn; the app only links out and stores what the person types.
 */
export function SalesNavReview({
  company,
  onResolved,
}: {
  company: Company
  onResolved: () => void
}) {
  const override = useOverrideStep(company.id)
  const [formOpen, setFormOpen] = useState(false)
  const [error, setError] = useState<string>()

  const markDone = async () => {
    setError(undefined)
    const reason = 'Reviewed by hand in Sales Navigator.'
    try {
      await override.mutateAsync({ step: 'account', status: 'completed', reason })
      await override.mutateAsync({ step: 'people', status: 'completed', reason })
      toast.success('Account and people marked as done.')
      onResolved()
    } catch (e) {
      setError(
        e instanceof ApiError ? e.message : 'Something went wrong. Nothing else was changed.',
      )
    }
  }

  return (
    <div className="flex flex-col gap-7">
      <Step n={1} title="Find the company in Sales Navigator">
        <dl className="grid gap-x-4 gap-y-2 rounded-xl border border-border bg-muted/35 p-4 text-sm sm:grid-cols-[8rem_minmax(0,1fr)]">
          <dt className="text-muted-foreground">Company</dt>
          <dd className="font-medium">{company.name}</dd>
          <dt className="text-muted-foreground">Website</dt>
          <dd>
            {company.website.url ? (
              <SourceLink href={company.website.url} label={shortUrl(company.website.url)} />
            ) : (
              <NotAvailable label="No website recorded" />
            )}
          </dd>
          <dt className="text-muted-foreground">Country</dt>
          <dd>{company.country ?? <NotAvailable />}</dd>
          <dt className="text-muted-foreground">Category</dt>
          <dd>{company.category ?? <NotAvailable />}</dd>
          <dt className="text-muted-foreground">Account step</dt>
          <dd>
            <StatusBadge kind="step" status={company.stages.account.status} />
          </dd>
        </dl>
        <div>
          <Button asChild variant="secondary">
            <a href={company.salesNav.searchUrl} target="_blank" rel="noopener noreferrer">
              Open Sales Navigator search
              <ArrowUpRight className="size-4" aria-hidden />
            </a>
          </Button>
          <p className="mt-1.5 text-[0.8125rem] text-muted-foreground">
            Opens in a new tab. You search and copy details by hand; the app never signs in or
            collects anything from LinkedIn.
          </p>
        </div>
      </Step>

      <Step n={2} title="Note the account and how sure you are">
        <SalesNavCard company={company} />
      </Step>

      <Step n={3} title={`Add the decision-makers you found (${company.contacts.length})`}>
        {company.contacts.length > 0 && (
          <ul aria-label="Saved decision-makers" className="flex flex-col gap-1 text-sm">
            {company.contacts.map((c) => (
              <li key={c.id}>
                <span className="font-medium">{fullName(c)}</span>
                <span className="text-muted-foreground"> · {c.title ?? 'No title recorded'}</span>
              </li>
            ))}
          </ul>
        )}
        <div>
          <Button variant="secondary" onClick={() => setFormOpen(true)}>
            <Plus className="size-4" aria-hidden />
            Add contact
          </Button>
        </div>
        <ContactForm
          open={formOpen}
          onOpenChange={setFormOpen}
          companyId={company.id}
          contacts={company.contacts}
          editing={undefined}
        />
      </Step>

      <Step n={4} title="Finish">
        <p className="text-[0.8125rem] text-muted-foreground">
          Leadership coverage above says how complete your list is. Choose &ldquo;Reviewed&rdquo;
          only if you checked beyond the limited Relationship Explorer panel. You can finish with
          &ldquo;Unknown&rdquo; or &ldquo;Confirmed partial&rdquo;; the list is then shown as
          incomplete.
        </p>
        {error && (
          <p role="alert" className="text-[0.8125rem] text-danger-ink">
            {error}
          </p>
        )}
        <div>
          <Button onClick={() => void markDone()} loading={override.isPending}>
            <CircleCheck className="size-4" aria-hidden />
            Mark account and people done
          </Button>
        </div>
      </Step>
    </div>
  )
}
