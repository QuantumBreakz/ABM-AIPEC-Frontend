import type { Company, Coverage } from '@/api/types'
import { COVERAGES } from '@/api/types'
import { ChartCard } from '@/components/charts/ChartCard'
import { DescriptionList } from '@/components/DescriptionList'
import { SourceLink } from '@/components/SourceLink'
import { COVERAGE_HINT, COVERAGE_META } from '@/lib/coverage'
import { shortUrl } from '@/lib/format'
import { missingReason } from '@/lib/missing'
import { useCompanyEdit } from './useCompanyEdit'

const CONFIDENCE = [
  { value: '', label: 'Not set' },
  { value: 'high', label: 'High' },
  { value: 'medium', label: 'Medium' },
  { value: 'low', label: 'Low' },
]

function CoverageText({ value }: { value: Coverage }) {
  const meta = COVERAGE_META[value]
  return (
    <div>
      <p className="font-medium">{meta.label}</p>
      <p className="text-[13px] text-muted-foreground">{meta.description}</p>
    </div>
  )
}

/**
 * Where the person recording this company's decision-makers writes down what they found in
 * Sales Navigator. We only link out and store what they type: nothing here talks to LinkedIn.
 */
export function SalesNavCard({ company }: { company: Company }) {
  const edit = useCompanyEdit(company)
  const sn = company.salesNav
  const confidence = CONFIDENCE.find((c) => c.value === (sn.matchConfidence ?? ''))

  return (
    <ChartCard
      title="Sales Navigator account"
      subtitle="Find the company in Sales Navigator yourself, then record what you found. Nothing here is automated."
    >
      <p className="mb-4 text-sm">
        <SourceLink href={sn.searchUrl} label="Open the Sales Navigator search" />
      </p>
      <DescriptionList
        missingReason={missingReason(company.stages.account, 'Not recorded yet')}
        items={[
          {
            label: 'Account page',
            value: sn.accountUrl ? (
              <SourceLink href={sn.accountUrl} label={shortUrl(sn.accountUrl)} />
            ) : undefined,
            edit: edit.url('salesNav.accountUrl', sn.accountUrl, {
              placeholder: 'https://www.linkedin.com/sales/company/…',
            }),
          },
          {
            label: 'Match confidence',
            value: sn.matchConfidence ? confidence?.label : undefined,
            edit: edit.select('salesNav.matchConfidence', sn.matchConfidence ?? '', {
              options: CONFIDENCE,
              hint: 'How sure you are that this is the same company.',
            }),
          },
          {
            label: 'Leadership coverage',
            value: <CoverageText value={company.leadershipCoverage} />,
            edit: edit.select('leadershipCoverage', company.leadershipCoverage, {
              options: COVERAGES.map((value) => ({ value, label: COVERAGE_META[value].label })),
              hint: COVERAGE_HINT,
            }),
          },
        ]}
      />
      {company.leadershipCoverage !== 'reviewed' && (
        <p className="mt-4 text-[13px] text-muted-foreground">
          The list of executives is not confirmed complete.
        </p>
      )}
    </ChartCard>
  )
}
