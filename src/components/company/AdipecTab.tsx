import type { Company, Edition } from '@/api/types'
import { DateTime } from '@/components/DateTime'
import { DescriptionList } from '@/components/DescriptionList'
import { SourceLink } from '@/components/SourceLink'

/**
 * Why a field is empty. If fetching the profile failed or only half worked, that is the reason;
 * otherwise ADIPEC simply did not publish it.
 */
function missingReasonFor(stages: Company['stages']) {
  return stages.profile.reason ?? 'ADIPEC did not publish this'
}

function EditionCard({ edition, missingReason }: { edition: Edition; missingReason: string }) {
  const extra = Object.entries(edition.extra ?? {})
  return (
    <section
      aria-label={`ADIPEC ${edition.edition}`}
      className="rounded-lg border border-border bg-surface p-5"
    >
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-base font-semibold">ADIPEC {edition.edition}</h2>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[13px] text-muted-foreground">
          <span>
            Captured <DateTime value={edition.capturedAt} />
          </span>
          <SourceLink href={edition.profileUrl} label="Open the ADIPEC profile" />
        </div>
      </div>
      <DescriptionList
        missingReason={missingReason}
        items={[
          { label: 'Stand', value: edition.stand },
          { label: 'Category', value: edition.category },
          { label: 'Country', value: edition.country },
          { label: 'Description', value: edition.description },
          ...extra.map(([label, value]) => ({ label, value })),
        ]}
      />
    </section>
  )
}

/** One card per edition the company took part in, newest first, with everything ADIPEC published. */
export function AdipecTab({ company }: { company: Company }) {
  const missingReason = missingReasonFor(company.stages)
  const editions = [...company.editions].sort((a, b) => b.edition - a.edition)
  return (
    <div className="flex flex-col gap-4">
      {editions.map((edition) => (
        <EditionCard key={edition.edition} edition={edition} missingReason={missingReason} />
      ))}
    </div>
  )
}
