import type { Company } from '@/api/types'
import { ChartCard } from '@/components/charts/ChartCard'
import { DescriptionList } from '@/components/DescriptionList'
import { SourceLink } from '@/components/SourceLink'
import { shortUrl } from '@/lib/format'
import { missingReason } from '@/lib/missing'
import { useCompanyEdit } from './useCompanyEdit'

const NETWORKS = [
  ['linkedin', 'LinkedIn'],
  ['facebook', 'Facebook'],
  ['instagram', 'Instagram'],
  ['x', 'X'],
  ['youtube', 'YouTube'],
] as const

/** The company's public social pages. Each network shows its link, or "Not found" and why. */
export function SocialsTab({ company }: { company: Company }) {
  const { socials } = company
  const edit = useCompanyEdit(company)
  const reason = missingReason(company.stages.social, 'No public page was found')

  return (
    <ChartCard
      title="Official social profiles"
      subtitle="Public pages that belong to the company, found through its website."
    >
      <DescriptionList
        missingLabel="Not found"
        missingReason={reason}
        items={[
          ...NETWORKS.map(([key, label]) => ({
            label,
            value: socials[key] ? (
              <SourceLink href={socials[key]} label={shortUrl(socials[key])} />
            ) : undefined,
            edit: edit.url(`socials.${key}`, socials[key]),
          })),
          {
            label: 'Other',
            value:
              socials.other.length > 0 ? (
                <ul aria-label="Other social links" className="flex flex-col gap-1">
                  {socials.other.map((url) => (
                    <li key={url}>
                      <SourceLink href={url} label={shortUrl(url)} />
                    </li>
                  ))}
                </ul>
              ) : undefined,
            edit: edit.urlList('socials.other', socials.other),
          },
        ]}
      />
    </ChartCard>
  )
}
