import type { Company } from '@/api/types'
import { ChartCard } from '@/components/charts/ChartCard'
import { FactItem } from '@/components/FactItem'
import { NotAvailable } from '@/components/NotAvailable'
import { SourceLink } from '@/components/SourceLink'
import { TagList } from '@/components/TagList'
import { shortUrl } from '@/lib/format'

/** What the drafts may be based on. Everything here has a source, so a reviewer can check the drafts against it. */
export function EvidencePane({ company }: { company: Company }) {
  const { website } = company
  const latest = [...company.editions].sort((a, b) => b.edition - a.edition)[0]
  const urls = [
    ...new Set([...company.ai.evidenceUrls, ...company.contacts.flatMap((c) => c.ai.evidenceUrls)]),
  ]

  return (
    <div className="flex flex-col gap-5">
      <ChartCard title="Facts with sources" subtitle="Check every draft against these.">
        {website.facts.length === 0 ? (
          <NotAvailable
            label="No facts recorded"
            reason={company.stages.website.reason ?? 'The website has not been researched yet'}
          />
        ) : (
          <ul>
            {website.facts.map((fact, i) => (
              <FactItem key={`${fact.sourceUrl}-${i}`} fact={fact} />
            ))}
          </ul>
        )}
      </ChartCard>

      <ChartCard title="Services and markets">
        <div className="flex flex-col gap-3 text-sm">
          <div>
            <p className="mb-1 text-[0.8125rem] font-medium text-muted-foreground">Services</p>
            {website.services.length > 0 ? (
              <TagList items={website.services} label="Services" />
            ) : (
              <NotAvailable />
            )}
          </div>
          <div>
            <p className="mb-1 text-[0.8125rem] font-medium text-muted-foreground">Markets</p>
            {website.markets.length > 0 ? (
              <TagList items={website.markets} label="Markets" />
            ) : (
              <NotAvailable />
            )}
          </div>
        </div>
      </ChartCard>

      <ChartCard title={latest ? `ADIPEC ${latest.edition} description` : 'ADIPEC description'}>
        {latest?.description ? (
          <p className="text-sm">{latest.description}</p>
        ) : (
          <NotAvailable reason="ADIPEC did not publish a description" />
        )}
      </ChartCard>

      {urls.length > 0 && (
        <ChartCard title="Pages the drafts cite">
          <ul className="flex flex-col gap-1.5">
            {urls.map((url) => (
              <li key={url}>
                <SourceLink href={url} label={shortUrl(url)} />
              </li>
            ))}
          </ul>
        </ChartCard>
      )}
    </div>
  )
}
