import { Pencil, Plus, Trash2, TriangleAlert } from 'lucide-react'
import { useId, useState } from 'react'
import { toast } from 'sonner'
import { ApiError } from '@/api/client'
import { useUpdateContact } from '@/api/queries/contacts'
import type { Company, Contact, Email, ReviewItem } from '@/api/types'
import { ConfirmDialog } from '@/components/ConfirmDialog'
import { DateTime } from '@/components/DateTime'
import { StatusBadge } from '@/components/StatusBadge'
import { Button } from '@/components/ui/button'
import { Input, Select } from '@/components/ui/input'
import { EMAIL_RE, fullName, PROVIDER_OPTIONS, sourceLabel, verificationNote } from '@/lib/contacts'

type EmailInput = { address: string; type?: 'business' | 'generic'; provider?: string }

const asInput = (e: Email): EmailInput => ({
  address: e.address,
  type: e.type,
  provider: e.provider,
})

/** Address plus where it came from. A source is required (AT-06). Used to correct or to add an email. */
function EmailEditForm({
  initial,
  submitLabel,
  onSubmit,
  onCancel,
}: {
  initial?: Email
  submitLabel: string
  onSubmit: (value: EmailInput) => Promise<void>
  onCancel: () => void
}) {
  const id = useId()
  const [address, setAddress] = useState(initial?.address ?? '')
  const [provider, setProvider] = useState(initial?.provider ?? '')
  const [errors, setErrors] = useState<{ address?: string; provider?: string; server?: string }>({})
  const [pending, setPending] = useState(false)

  const submit = async (event: React.FormEvent) => {
    event.preventDefault()
    const next: typeof errors = {}
    if (!EMAIL_RE.test(address.trim())) next.address = 'Enter a valid email address.'
    if (!provider) next.provider = 'Say where this email came from.'
    setErrors(next)
    if (next.address || next.provider) return
    setPending(true)
    try {
      await onSubmit({ address: address.trim().toLowerCase(), type: initial?.type, provider })
    } catch (e) {
      setErrors({ server: e instanceof ApiError ? e.message : 'The email could not be saved.' })
      setPending(false)
    }
  }

  return (
    <form
      onSubmit={(e) => void submit(e)}
      noValidate
      className="mt-2 grid gap-3 rounded-lg bg-muted/40 p-3 sm:grid-cols-2"
    >
      {errors.server && (
        <p
          role="alert"
          className="flex items-start gap-2 text-[13px] text-danger-ink sm:col-span-2"
        >
          <TriangleAlert className="mt-0.5 size-4 shrink-0" aria-hidden />
          {errors.server}
        </p>
      )}
      <div className="flex flex-col gap-1">
        <label htmlFor={`${id}-a`} className="text-[0.8125rem] font-medium">
          Email address
        </label>
        <Input
          id={`${id}-a`}
          type="email"
          value={address}
          onChange={(e) => setAddress(e.target.value)}
          aria-invalid={errors.address ? true : undefined}
        />
        {errors.address && (
          <p role="alert" className="text-[13px] text-danger-ink">
            {errors.address}
          </p>
        )}
      </div>
      <div className="flex flex-col gap-1">
        <label htmlFor={`${id}-p`} className="text-[0.8125rem] font-medium">
          Where did you find it?
        </label>
        <Select
          id={`${id}-p`}
          value={provider}
          onChange={(e) => setProvider(e.target.value)}
          aria-invalid={errors.provider ? true : undefined}
        >
          <option value="">Choose a source…</option>
          {PROVIDER_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </Select>
        {errors.provider && (
          <p role="alert" className="text-[13px] text-danger-ink">
            {errors.provider}
          </p>
        )}
      </div>
      <div className="flex justify-end gap-2 sm:col-span-2">
        <Button type="button" variant="secondary" onClick={onCancel} disabled={pending}>
          Cancel
        </Button>
        <Button type="submit" loading={pending}>
          {submitLabel}
        </Button>
      </div>
    </form>
  )
}

function ContactEmails({ company, contact }: { company: Company; contact: Contact }) {
  const update = useUpdateContact(company.id)
  const [editing, setEditing] = useState<string>()
  const [adding, setAdding] = useState(false)
  const [removing, setRemoving] = useState<Email>()

  const save = async (emails: EmailInput[], message: string) => {
    await update.mutateAsync({ id: contact.id, changes: { emails } })
    toast.success(message)
  }
  const all = contact.emails.map(asInput)

  return (
    <section aria-label={`Emails of ${fullName(contact)}`} className="flex flex-col gap-3">
      <h3 className="text-sm font-semibold">{fullName(contact)}</h3>
      {contact.emails.length === 0 && (
        <p className="text-sm text-muted-foreground">No emails saved for this person.</p>
      )}
      <ul className="flex flex-col gap-3">
        {contact.emails.map((email) => {
          const source = sourceLabel(email.provider)
          return (
            <li key={email.address} className="rounded-xl border border-border p-3">
              <div className="flex flex-wrap items-center gap-2">
                <span className="break-all font-mono text-[0.8125rem]">{email.address}</span>
                <StatusBadge
                  kind="email"
                  status={email.verification.status}
                  reason={verificationNote(email)}
                />
              </div>
              <p className="mt-0.5 text-xs text-muted-foreground">
                {source ? (
                  `Source: ${source}`
                ) : (
                  <span className="font-medium text-warning-ink">No source recorded</span>
                )}{' '}
                · Added <DateTime value={email.capturedAt} />
              </p>
              {editing === email.address ? (
                <EmailEditForm
                  initial={email}
                  submitLabel="Save email"
                  onCancel={() => setEditing(undefined)}
                  onSubmit={async (value) => {
                    await save(
                      all.map((e) => (e.address === email.address ? value : e)),
                      'Email saved. It has not been checked yet.',
                    )
                    setEditing(undefined)
                  }}
                />
              ) : (
                <div className="mt-2 flex gap-2">
                  <Button
                    size="sm"
                    variant="secondary"
                    aria-label={`Correct ${email.address}`}
                    onClick={() => setEditing(email.address)}
                  >
                    <Pencil className="size-4" aria-hidden />
                    Correct
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    aria-label={`Remove ${email.address}`}
                    onClick={() => setRemoving(email)}
                  >
                    <Trash2 className="size-4" aria-hidden />
                    Remove
                  </Button>
                </div>
              )}
            </li>
          )
        })}
      </ul>

      {adding ? (
        <EmailEditForm
          submitLabel="Add email"
          onCancel={() => setAdding(false)}
          onSubmit={async (value) => {
            await save([...all, value], 'Email added. It has not been checked yet.')
            setAdding(false)
          }}
        />
      ) : (
        <div>
          <Button variant="secondary" size="sm" onClick={() => setAdding(true)}>
            <Plus className="size-4" aria-hidden />
            Add email
          </Button>
        </div>
      )}

      <ConfirmDialog
        open={!!removing}
        onOpenChange={(open) => !open && setRemoving(undefined)}
        title={removing ? `Remove ${removing.address}?` : 'Remove email?'}
        description="The address is removed from this person. The change is recorded in the history."
        confirmLabel="Remove"
        destructive
        pending={update.isPending}
        onConfirm={() => {
          if (!removing) return
          void save(
            all.filter((e) => e.address !== removing.address),
            'Email removed.',
          )
            .catch((e) =>
              toast.error(e instanceof ApiError ? e.message : 'The email could not be removed.'),
            )
            .finally(() => setRemoving(undefined))
        }}
      />
    </section>
  )
}

/** An email that is invalid, risky or unknown: correct it, remove it, or add another with its source. */
export function EmailsReview({
  company,
  item,
}: {
  company: Company
  item: ReviewItem | undefined
}) {
  const contact = company.contacts.find((c) => c.id === item?.contactId)
  if (!contact) {
    return (
      <p className="text-sm text-muted-foreground">
        This item is no longer in the queue. The person may have been changed or removed.
      </p>
    )
  }
  return (
    <div className="flex flex-col gap-5">
      {item && (
        <p className="rounded-xl border border-border bg-muted/35 p-4 text-sm">
          <span className="text-muted-foreground">Why it is here: </span>
          {item.reason}
        </p>
      )}
      <ContactEmails company={company} contact={contact} />
    </div>
  )
}
