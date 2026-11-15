import { Check, Copy, Pencil, RefreshCw, TriangleAlert, X } from 'lucide-react'
import { useId, useState } from 'react'
import { toast } from 'sonner'
import { ApiError } from '@/api/client'
import type { AiPatch, CompanyAi, ContactAi } from '@/api/types'
import { ConfirmDialog } from '@/components/ConfirmDialog'
import { DateTime } from '@/components/DateTime'
import { NotAvailable } from '@/components/NotAvailable'
import { SourceLink } from '@/components/SourceLink'
import { StatusBadge } from '@/components/StatusBadge'
import { Button } from '@/components/ui/button'
import { Input, Select, Textarea } from '@/components/ui/input'
import {
  type AiFieldDef,
  approveBlocker,
  currentFields,
  differsFromApproved,
  guideStatus,
} from '@/lib/ai'
import { safeHttpUrl, shortUrl } from '@/lib/format'

const messageOf = (e: unknown, fallback: string) => (e instanceof ApiError ? e.message : fallback)

function Guide({ text, guide }: { text: string; guide: { min: number; max: number } }) {
  const g = guideStatus(text, guide)
  return (
    <p className={g.ok ? 'text-xs text-muted-foreground' : 'text-xs font-medium text-warning-ink'}>
      {g.label} ({g.range}){!g.ok && ' · outside the suggestion, you can still save'}
    </p>
  )
}

function FieldValue({ def, value }: { def: AiFieldDef; value: string }) {
  if (!value.trim()) return <NotAvailable label="Not written yet" />
  if (def.kind === 'url') return <SourceLink href={value} label={shortUrl(value)} />
  return <p className="whitespace-pre-wrap">{value}</p>
}

/** Read-only list of fields. Used for the draft, an older version and the approved copy. */
export function FieldList({
  defs,
  values,
  copyable,
}: {
  defs: AiFieldDef[]
  values: Record<string, string>
  copyable?: boolean
}) {
  const copy = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text)
      toast.success(`${label} copied.`)
    } catch {
      toast.error('Could not copy. Select the text and copy it by hand.')
    }
  }
  return (
    <dl className="flex flex-col gap-3.5 text-sm">
      {defs.map((def) => {
        const value = values[def.key] ?? ''
        return (
          <div key={def.key}>
            <dt className="flex items-center justify-between gap-2 text-[0.8125rem] font-medium text-muted-foreground">
              {def.label}
              {copyable && def.kind !== 'url' && value.trim() && (
                <Button
                  variant="ghost"
                  size="sm"
                  aria-label={`Copy ${def.label}`}
                  onClick={() => void copy(value, def.label)}
                >
                  <Copy className="size-3.5" aria-hidden />
                  Copy
                </Button>
              )}
            </dt>
            <dd className="mt-0.5">
              <FieldValue def={def} value={value} />
              {def.guide && value.trim() && <Guide text={value} guide={def.guide} />}
            </dd>
          </div>
        )
      })}
    </dl>
  )
}

function EditFields({
  defs,
  values,
  onChange,
}: {
  defs: AiFieldDef[]
  values: Record<string, string>
  onChange: (key: string, value: string) => void
}) {
  const id = useId()
  return (
    <div className="flex flex-col gap-3.5">
      {defs.map((def) => {
        const fieldId = `${id}-${def.key}`
        const value = values[def.key] ?? ''
        const badUrl = def.kind === 'url' && value.trim() !== '' && !safeHttpUrl(value)
        return (
          <div key={def.key} className="flex flex-col gap-1">
            <label htmlFor={fieldId} className="text-[0.8125rem] font-medium">
              {def.label}
            </label>
            {def.kind === 'textarea' ? (
              <Textarea
                id={fieldId}
                rows={def.key === 'draft' ? 7 : 3}
                value={value}
                onChange={(e) => onChange(def.key, e.target.value)}
              />
            ) : (
              <Input
                id={fieldId}
                type={def.kind === 'url' ? 'url' : 'text'}
                value={value}
                onChange={(e) => onChange(def.key, e.target.value)}
                aria-invalid={badUrl ? true : undefined}
              />
            )}
            {badUrl && (
              <p role="alert" className="text-[13px] text-danger-ink">
                Enter a full web address starting with http:// or https://.
              </p>
            )}
            {def.hint && !badUrl && (
              <p className="text-[0.8125rem] text-muted-foreground">{def.hint}</p>
            )}
            {def.guide && <Guide text={value} guide={def.guide} />}
          </div>
        )
      })}
    </div>
  )
}

/**
 * One piece of AI text (the company's, or one contact's): the draft, its versions, the approved
 * copy, and the actions. Approving never overwrites the approved copy until you approve again, and
 * nothing here sends anything anywhere.
 */
export function AiBlock({
  title,
  subtitle,
  ai,
  defs,
  isCompany,
  generating,
  onAction,
  onRegenerate,
}: {
  title: string
  subtitle?: string
  ai: CompanyAi | ContactAi
  defs: AiFieldDef[]
  isCompany: boolean
  generating: boolean
  onAction: (patch: AiPatch) => Promise<unknown>
  onRegenerate: () => Promise<unknown>
}) {
  const versionId = useId()
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState<Record<string, string>>({})
  const [viewing, setViewing] = useState('current')
  const [rejecting, setRejecting] = useState(false)
  const [reason, setReason] = useState('')
  const [reasonError, setReasonError] = useState<string>()
  const [busy, setBusy] = useState(false)

  const current = currentFields(ai, defs)
  const oldVersion = viewing === 'current' ? undefined : ai.versions[Number(viewing)]
  const shown = oldVersion?.fields ?? current
  const blocker = generating
    ? 'A new draft is being written.'
    : approveBlocker(ai, current, isCompany)

  const run = async (action: () => Promise<unknown>, success: string, failure: string) => {
    setBusy(true)
    try {
      await action()
      toast.success(success)
      return true
    } catch (e) {
      toast.error(messageOf(e, failure))
      return false
    } finally {
      setBusy(false)
    }
  }

  const startEdit = () => {
    setDraft({ ...shown })
    setViewing('current')
    setEditing(true)
  }

  const save = async () => {
    if (
      await run(
        () => onAction({ action: 'save', fields: draft }),
        'Saved as a new version.',
        'Could not save.',
      )
    )
      setEditing(false)
  }

  const restoreOld = async () => {
    if (!oldVersion) return
    if (
      await run(
        () => onAction({ action: 'save', fields: oldVersion.fields }),
        'Saved as the new draft.',
        'Could not save.',
      )
    )
      setViewing('current')
  }

  const reject = async () => {
    if (reason.trim().length < 3) {
      setReasonError('Give a short reason, so the next person knows why.')
      return
    }
    if (
      await run(
        () => onAction({ action: 'reject', reason: reason.trim() }),
        'Rejected.',
        'Could not reject.',
      )
    ) {
      setRejecting(false)
      setReason('')
    }
  }

  const approved = ai.approved
  const approvedDiffers = differsFromApproved(current, approved)

  return (
    <section aria-label={title} className="card-elevated flex flex-col gap-4 p-5">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h2 className="text-base font-semibold tracking-tight">{title}</h2>
          {subtitle && <p className="text-[0.8125rem] text-muted-foreground">{subtitle}</p>}
        </div>
        {generating ? (
          <span role="status" className="text-sm font-medium text-muted-foreground">
            Generating…
          </span>
        ) : (
          <StatusBadge kind="ai" status={ai.status} reason={ai.reason} />
        )}
      </div>

      {ai.status === 'insufficient_evidence' && !generating && (
        <div
          role="alert"
          className="flex items-start gap-2.5 rounded-lg border border-warning/30 bg-warning-soft px-3.5 py-2.5 text-sm text-warning-ink"
        >
          <TriangleAlert className="mt-0.5 size-4 shrink-0" aria-hidden />
          <p>
            There is not enough sourced information to write this safely
            {ai.reason ? `: ${ai.reason}` : '.'} Add a source and regenerate, or write it yourself
            and save it.
          </p>
        </div>
      )}
      {ai.status === 'rejected' && ai.reason && (
        <p className="text-sm text-danger-ink">Rejected: {ai.reason}</p>
      )}
      {ai.status === 'pending' && !generating && ai.reason && (
        <p className="text-sm text-muted-foreground">{ai.reason}</p>
      )}

      {ai.versions.length > 1 && !editing && (
        <div className="flex flex-wrap items-center gap-2">
          <label htmlFor={versionId} className="text-[0.8125rem] font-medium">
            Version
          </label>
          <Select
            id={versionId}
            className="max-w-xs"
            value={viewing}
            onChange={(e) => setViewing(e.target.value)}
          >
            <option value="current">Current draft</option>
            {ai.versions.map((v, i) => (
              <option key={`${v.at}-${i}`} value={String(i)}>
                Version {ai.versions.length - i} · {v.by === 'ai' ? 'AI' : v.by} ·{' '}
                {new Date(v.at).toLocaleString()}
              </option>
            ))}
          </Select>
        </div>
      )}

      {editing ? (
        <EditFields
          defs={defs}
          values={draft}
          onChange={(k, v) => setDraft((d) => ({ ...d, [k]: v }))}
        />
      ) : (
        <FieldList defs={defs} values={shown} copyable={!isCompany} />
      )}

      {!isCompany && (
        <p className="text-xs text-muted-foreground">
          Drafts are for you to read, edit and send yourself. The app never sends email or LinkedIn
          messages.
        </p>
      )}

      {oldVersion && !editing && (
        <div className="flex flex-wrap items-center gap-2 rounded-lg bg-muted/50 px-3 py-2 text-sm">
          <span>You are looking at an older version.</span>
          <Button size="sm" variant="secondary" loading={busy} onClick={() => void restoreOld()}>
            Use this version as the new draft
          </Button>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2 border-t border-border/70 pt-3.5">
        {editing ? (
          <>
            <Button loading={busy} onClick={() => void save()}>
              <Check className="size-4" aria-hidden />
              Save
            </Button>
            <Button variant="secondary" disabled={busy} onClick={() => setEditing(false)}>
              Cancel
            </Button>
          </>
        ) : (
          <>
            <Button variant="secondary" onClick={startEdit} disabled={generating}>
              <Pencil className="size-4" aria-hidden />
              Edit
            </Button>
            <Button
              disabled={!!blocker || !!oldVersion}
              loading={busy}
              onClick={() =>
                void run(() => onAction({ action: 'approve' }), 'Approved.', 'Could not approve.')
              }
            >
              <Check className="size-4" aria-hidden />
              Approve
            </Button>
            <Button
              variant="secondary"
              disabled={generating || ai.status === 'pending'}
              onClick={() => setRejecting(true)}
            >
              <X className="size-4" aria-hidden />
              Reject
            </Button>
            <Button
              variant="ghost"
              disabled={generating}
              onClick={() =>
                void run(
                  onRegenerate,
                  'A new draft was requested.',
                  'Could not ask for a new draft.',
                )
              }
            >
              <RefreshCw className="size-4" aria-hidden />
              Regenerate
            </Button>
          </>
        )}
      </div>
      {!editing && blocker && !generating && (
        <p className="-mt-2 text-[0.8125rem] text-muted-foreground">Approve is off: {blocker}</p>
      )}
      {!editing && approved && (
        <p className="-mt-2 text-[0.8125rem] text-muted-foreground">
          Regenerating adds a new draft. The approved copy below stays as it is.
        </p>
      )}

      {approved && (
        <section
          aria-label={`Approved copy, ${title}`}
          className="rounded-xl border border-success/30 bg-success-soft/50 p-4"
        >
          <h3 className="mb-2 flex flex-wrap items-center gap-x-2 text-sm font-semibold text-success-ink">
            Approved copy
            <span className="text-xs font-normal">
              approved <DateTime value={approved.at} /> by {approved.by}
            </span>
          </h3>
          <FieldList defs={defs} values={approved.fields} />
          {approvedDiffers && (
            <p className="mt-3 text-[0.8125rem] text-foreground">
              The current draft is different. Exports use this approved copy until you approve
              again.
            </p>
          )}
        </section>
      )}

      <ConfirmDialog
        open={rejecting}
        onOpenChange={(open) => {
          setRejecting(open)
          if (!open) setReasonError(undefined)
        }}
        title="Reject this draft?"
        description="Say why, so the next person knows what to fix."
        confirmLabel="Reject"
        destructive
        pending={busy}
        onConfirm={() => void reject()}
      >
        <label htmlFor={`${versionId}-reason`} className="text-[0.8125rem] font-medium">
          Reason
        </label>
        <Textarea
          id={`${versionId}-reason`}
          rows={3}
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          aria-invalid={reasonError ? true : undefined}
        />
        {reasonError && (
          <p role="alert" className="mt-1 text-[13px] text-danger-ink">
            {reasonError}
          </p>
        )}
      </ConfirmDialog>
    </section>
  )
}
