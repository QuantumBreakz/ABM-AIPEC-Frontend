import { ArrowLeft } from 'lucide-react'
import { useState } from 'react'
import { Link, useParams } from 'react-router'
import { useCompanyAiAction, useContactAiAction, useRegenerate } from '@/api/queries/ai'
import { useCompany } from '@/api/queries/companies'
import { AiBlock } from '@/components/ai/AiBlock'
import { EvidencePane } from '@/components/ai/EvidencePane'
import { EmptyState } from '@/components/EmptyState'
import { ErrorState } from '@/components/ErrorState'
import { PageHeader } from '@/components/PageHeader'
import { Skeleton } from '@/components/Skeleton'
import { Button } from '@/components/ui/button'
import { COMPANY_FIELDS, CONTACT_FIELDS } from '@/lib/ai'
import { fullName } from '@/lib/contacts'
import { usePageTitle } from '@/lib/usePageTitle'

/** How long to wait for a new draft before showing whatever state the server is in. */
const WAIT_MS = 60_000

type Waiting = Record<string, { versions: number }>

/**
 * Review the personalization for one company: the evidence on the left, the company's draft and
 * each contact's drafts on the right. Nothing is sent from here; people copy and send drafts themselves.
 */
export default function AiReviewPage() {
  const { companyId } = useParams()
  const [waiting, setWaiting] = useState<Waiting>({})
  const company = useCompany(companyId, { poll: Object.keys(waiting).length > 0 })
  const companyAction = useCompanyAiAction(companyId ?? '')
  const contactAction = useContactAiAction(companyId ?? '')
  const regenerate = useRegenerate(companyId ?? '')
  usePageTitle(company.data ? `AI review · ${company.data.name}` : 'AI review')

  const back = (
    <Button asChild variant="ghost" size="sm" className="-ml-2 mb-2">
      <Link to={companyId ? `/companies/${companyId}/ai` : '/review/ai'}>
        <ArrowLeft className="size-4" aria-hidden />
        Back to the company
      </Link>
    </Button>
  )

  if (company.isPending) {
    return (
      <>
        {back}
        <div role="status" aria-busy="true" className="grid gap-5 lg:grid-cols-2">
          <span className="sr-only">Loading…</span>
          <Skeleton className="h-96" />
          <Skeleton className="h-96" />
        </div>
      </>
    )
  }
  if (company.error || !company.data) {
    return (
      <>
        {back}
        <div className="card-elevated">
          <ErrorState error={company.error} onRetry={() => void company.refetch()} />
        </div>
      </>
    )
  }

  const data = company.data

  /** Remember that a new draft was asked for, and stop waiting after a while. */
  const startWaiting = (key: string, versions: number) => {
    setWaiting((w) => ({ ...w, [key]: { versions } }))
    setTimeout(
      () =>
        setWaiting((w) => {
          return Object.fromEntries(Object.entries(w).filter(([k]) => k !== key))
        }),
      WAIT_MS,
    )
  }
  const isGenerating = (key: string, ai: { status: string; versions: unknown[] }) =>
    !!waiting[key] && ai.status === 'pending' && ai.versions.length === waiting[key].versions

  return (
    <>
      {back}
      <PageHeader
        title={`AI review · ${data.name}`}
        description="Check each draft against the evidence, edit it, then approve or reject it."
      />
      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
        <div>
          <h2 className="mb-3 text-sm font-semibold text-muted-foreground">Evidence</h2>
          <EvidencePane company={data} />
        </div>
        <div className="flex flex-col gap-5">
          <h2 className="-mb-2 text-sm font-semibold text-muted-foreground">Drafts</h2>
          <AiBlock
            title="Company"
            subtitle="Summary, signal and hypothesis for this company."
            ai={data.ai}
            defs={COMPANY_FIELDS}
            isCompany
            generating={isGenerating('company', data.ai)}
            onAction={(patch) => companyAction.mutateAsync(patch)}
            onRegenerate={async () => {
              await regenerate.mutateAsync({ kind: 'company' })
              startWaiting('company', data.ai.versions.length)
            }}
          />
          {data.contacts.length === 0 ? (
            <div className="card-elevated">
              <EmptyState
                title="No contacts yet"
                hint="Messages are written per person. Add a contact first."
              />
            </div>
          ) : (
            data.contacts.map((contact) => (
              <AiBlock
                key={contact.id}
                title={fullName(contact)}
                subtitle={contact.title ?? 'No title recorded'}
                ai={contact.ai}
                defs={CONTACT_FIELDS}
                isCompany={false}
                generating={isGenerating(contact.id, contact.ai)}
                onAction={(patch) => contactAction.mutateAsync({ contactId: contact.id, patch })}
                onRegenerate={async () => {
                  await regenerate.mutateAsync({ kind: 'contact', contactId: contact.id })
                  startWaiting(contact.id, contact.ai.versions.length)
                }}
              />
            ))
          )}
        </div>
      </div>
    </>
  )
}
