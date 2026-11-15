import { ArrowUpRight, Sparkles } from 'lucide-react'
import { Link } from 'react-router'
import type { AiVersion, Company } from '@/api/types'
import { FieldList } from '@/components/ai/AiBlock'
import { ChartCard } from '@/components/charts/ChartCard'
import { DateTime } from '@/components/DateTime'
import { EmptyState } from '@/components/EmptyState'
import { NotAvailable } from '@/components/NotAvailable'
import { StatusBadge } from '@/components/StatusBadge'
import { Button } from '@/components/ui/button'
import { COMPANY_FIELDS, currentFields } from '@/lib/ai'
import { fullName } from '@/lib/contacts'

function ApprovedLine({ approved }: { approved: AiVersion | undefined }) {
  return approved ? (
    <p className="text-[0.8125rem] text-muted-foreground">
      Approved <DateTime value={approved.at} /> by {approved.by}
    </p>
  ) : (
    <p className="text-[0.8125rem] text-muted-foreground">Nothing approved yet.</p>
  )
}

/**
 * A read-only look at the drafts for this company and its contacts. Editing, approving and
 * rejecting happen on the AI review page, where the evidence sits next to the text.
 */
export function AiTab({ company }: { company: Company }) {
  const { ai, contacts } = company
  const hasDraft = ai.status !== 'pending' && ai.status !== 'insufficient_evidence'

  return (
    <div className="flex flex-col gap-6">
      <ChartCard
        title="Company draft"
        subtitle="Summary, signal and hypothesis for this company."
        action={
          <div className="flex items-center gap-3">
            <StatusBadge kind="ai" status={ai.status} reason={ai.reason} />
            <Button asChild size="sm">
              <Link to={`/ai/${company.id}`}>
                Open AI review
                <ArrowUpRight className="size-4" aria-hidden />
              </Link>
            </Button>
          </div>
        }
      >
        {hasDraft ? (
          <div className="flex flex-col gap-4">
            <FieldList defs={COMPANY_FIELDS} values={currentFields(ai, COMPANY_FIELDS)} />
            <ApprovedLine approved={ai.approved} />
          </div>
        ) : (
          <EmptyState
            icon={Sparkles}
            title={ai.status === 'pending' ? 'No draft yet' : 'Not enough evidence for a draft'}
            hint={
              ai.reason ??
              'Nothing is written without a sourced fact to base it on. Add a source, then regenerate.'
            }
          />
        )}
      </ChartCard>

      <ChartCard
        title={`Contact messages (${contacts.length})`}
        subtitle="Drafts are for you to copy and send yourself. The app never sends anything."
      >
        {contacts.length === 0 ? (
          <NotAvailable label="No contacts yet" reason="messages are written per person" />
        ) : (
          <ul className="divide-y divide-border">
            {contacts.map((contact) => (
              <li
                key={contact.id}
                className="flex flex-wrap items-start justify-between gap-3 py-3 first:pt-0 last:pb-0"
              >
                <div className="min-w-0">
                  <p className="text-sm font-semibold">{fullName(contact)}</p>
                  <p className="text-[0.8125rem] text-muted-foreground">
                    {contact.ai.subject ? (
                      <>Subject: {contact.ai.subject}</>
                    ) : (
                      <NotAvailable label="No draft yet" reason={contact.ai.reason} />
                    )}
                  </p>
                  <ApprovedLine approved={contact.ai.approved} />
                </div>
                <StatusBadge kind="ai" status={contact.ai.status} reason={contact.ai.reason} />
              </li>
            ))}
          </ul>
        )}
      </ChartCard>
    </div>
  )
}
