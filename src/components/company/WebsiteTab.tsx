import { Globe } from 'lucide-react'
import type { Company } from '@/api/types'
import { ChartCard } from '@/components/charts/ChartCard'
import { DateTime } from '@/components/DateTime'
import { DescriptionList } from '@/components/DescriptionList'
import { EmptyState } from '@/components/EmptyState'
import { FactItem } from '@/components/FactItem'
import { SourceLink } from '@/components/SourceLink'
import { TagList } from '@/components/TagList'
import { shortUrl } from '@/lib/format'
import { missingReason } from '@/lib/missing'
import { useCompanyEdit } from './useCompanyEdit'

function PlainList({ items, label }: { items: string[]; label: string }) {
  return (
    <ul aria-label={label} className="flex flex-col gap-0.5">
      {items.map((item) => (
        <li key={item}>{item}</li>
      ))}
    </ul>
  )
}

/** What the official website says: summary, services, markets, contact details, sourced facts and the pages read. */
export function WebsiteTab({ company }: { company: Company }) {
  const site = company.website
  const edit = useCompanyEdit(company)
  const step = company.stages.website
  const reason = missingReason(step, 'The website does not say')
  const contact = site.contactDetails
  const hasContact = contact.emails.length + contact.phones.length + contact.addresses.length > 0

  return (
    <div className="flex flex-col gap-6">
      <div className="grid gap-6 lg:grid-cols-2">
        <ChartCard title="About the company">
          <DescriptionList
            missingReason={reason}
            items={[
              {
                label: 'Website',
                value: site.url ? <SourceLink href={site.url} /> : undefined,
                edit: edit.url('website.url', site.url),
              },
              {
                label: 'Summary',
                value: site.summary,
                edit: edit.textarea('website.summary', site.summary),
              },
              {
                label: 'Services',
                value: site.services.length ? (
                  <TagList items={site.services} label="Services" />
                ) : undefined,
                edit: edit.list('website.services', site.services, {
                  hint: 'One service per line.',
                }),
              },
              {
                label: 'Markets',
                value: site.markets.length ? (
                  <TagList items={site.markets} label="Markets" />
                ) : undefined,
                edit: edit.list('website.markets', site.markets, {
                  hint: 'One market per line.',
                }),
              },
            ]}
          />
        </ChartCard>

        <ChartCard title="Contact details">
          <DescriptionList
            missingReason={missingReason(step, 'No contact details were found on the website')}
            items={[
              {
                label: 'Emails',
                value: contact.emails.length ? (
                  <PlainList items={contact.emails} label="Emails" />
                ) : undefined,
              },
              {
                label: 'Phones',
                value: contact.phones.length ? (
                  <PlainList items={contact.phones} label="Phones" />
                ) : undefined,
              },
              {
                label: 'Addresses',
                value: contact.addresses.length ? (
                  <PlainList items={contact.addresses} label="Addresses" />
                ) : undefined,
              },
              {
                label: 'Found on',
                // Details without a source are flagged, never shown as if they were sourced.
                value: hasContact ? (
                  contact.sourceUrl ? (
                    <SourceLink href={contact.sourceUrl} label={shortUrl(contact.sourceUrl)} />
                  ) : (
                    <span className="text-muted-foreground">No source was recorded</span>
                  )
                ) : undefined,
              },
            ]}
          />
        </ChartCard>
      </div>

      <ChartCard
        title="Facts and inferences"
        action={
          site.facts.length > 0 ? (
            <span className="rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium tabular-nums text-muted-foreground">
              {site.facts.length} items
            </span>
          ) : undefined
        }
      >
        {site.facts.length > 0 ? (
          <ul aria-label="Facts and inferences">
            {site.facts.map((fact) => (
              <FactItem key={`${fact.kind}-${fact.text}`} fact={fact} />
            ))}
          </ul>
        ) : (
          <EmptyState
            icon={Globe}
            title="No facts recorded yet"
            hint={missingReason(step, 'Nothing citable was found on the website.')}
          />
        )}
      </ChartCard>

      <div className="grid gap-6 lg:grid-cols-2">
        <ChartCard title={`Pages reviewed (${site.pagesReviewed.length})`}>
          {site.pagesReviewed.length > 0 ? (
            <ul aria-label="Pages reviewed" className="flex flex-col divide-y divide-border">
              {site.pagesReviewed.map((page) => (
                <li
                  key={page.url}
                  className="flex flex-wrap items-center justify-between gap-2 py-2 first:pt-0 last:pb-0"
                >
                  <SourceLink href={page.url} label={shortUrl(page.url)} />
                  <span className="text-[13px] text-muted-foreground">
                    <DateTime value={page.fetchedAt} />
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-muted-foreground">
              No pages were reviewed. {missingReason(step, '')}
            </p>
          )}
        </ChartCard>

        <ChartCard title={`Pages skipped (${site.skipped.length})`}>
          {site.skipped.length > 0 ? (
            <ul aria-label="Pages skipped" className="flex flex-col divide-y divide-border">
              {site.skipped.map((page) => (
                <li key={page.url} className="py-2 first:pt-0 last:pb-0">
                  <SourceLink href={page.url} label={shortUrl(page.url)} />
                  <p className="mt-0.5 text-[13px] text-muted-foreground">{page.reason}</p>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-muted-foreground">No pages were skipped.</p>
          )}
        </ChartCard>
      </div>
    </div>
  )
}
