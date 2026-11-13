import { zodResolver } from '@hookform/resolvers/zod'
import * as Dialog from '@radix-ui/react-dialog'
import { Info, Plus, TriangleAlert, Trash2, X } from 'lucide-react'
import { type ReactNode, useId, useState } from 'react'
import { useFieldArray, useForm, useWatch } from 'react-hook-form'
import { toast } from 'sonner'
import { z } from 'zod'
import { ApiError } from '@/api/client'
import { useCreateContact, useUpdateContact } from '@/api/queries/contacts'
import type { Confidence, Contact, ContactInput } from '@/api/types'
import { Button } from '@/components/ui/button'
import { Input, Select } from '@/components/ui/input'
import {
  CONFIDENCE_OPTIONS,
  EMAIL_RE,
  fullName,
  PROVIDER_OPTIONS,
  SENIORITY_OPTIONS,
  sameName,
} from '@/lib/contacts'
import { safeHttpUrl } from '@/lib/format'
import { URL_MESSAGE } from '@/lib/patch'

const emailSchema = z.object({
  address: z
    .string()
    .trim()
    .min(1, 'Enter the email address.')
    .refine((v) => EMAIL_RE.test(v), 'Enter a valid email address.'),
  type: z.enum(['business', 'generic']),
  // AT-06: an email without a source cannot be saved
  provider: z.string().min(1, 'Say where this email came from.'),
})

const schema = z.object({
  firstName: z.string().trim().min(1, 'Enter a first name.'),
  lastName: z.string().trim().min(1, 'Enter a last name.'),
  title: z.string().trim(),
  seniority: z.string(),
  profileUrl: z
    .string()
    .trim()
    .refine((v) => v === '' || !!safeHttpUrl(v), URL_MESSAGE),
  geography: z.string().trim(),
  matchConfidence: z.string(),
  source: z.string().min(1, 'Say where you found this person.'),
  emails: z.array(emailSchema),
})
type Values = z.infer<typeof schema>

function Field({
  label,
  error,
  hint,
  htmlFor,
  children,
}: {
  label: string
  error?: string
  hint?: string
  htmlFor: string
  children: ReactNode
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={htmlFor} className="text-[0.8125rem] font-medium text-foreground">
        {label}
      </label>
      {children}
      {hint && !error && <p className="text-[0.8125rem] text-muted-foreground">{hint}</p>}
      {error && (
        <p role="alert" className="text-[0.8125rem] text-danger-ink">
          {error}
        </p>
      )}
    </div>
  )
}

function defaultsFor(contact: Contact | undefined): Values {
  return {
    firstName: contact?.firstName ?? '',
    lastName: contact?.lastName ?? '',
    title: contact?.title ?? '',
    seniority: contact?.seniority ?? '',
    profileUrl: contact?.profileUrl ?? '',
    geography: contact?.geography ?? '',
    matchConfidence: contact?.matchConfidence ?? '',
    source: contact?.source ?? 'manual',
    emails: (contact?.emails ?? []).map((e) => ({
      address: e.address,
      type: e.type ?? 'business',
      provider: e.provider ?? '',
    })),
  }
}

function ContactFormInner({
  companyId,
  contacts,
  editing,
  onClose,
}: {
  companyId: string
  /** The company's current contacts, to warn when a name already exists. */
  contacts: Contact[]
  editing: Contact | undefined
  onClose: () => void
}) {
  const create = useCreateContact(companyId)
  const update = useUpdateContact(companyId)
  const [serverError, setServerError] = useState<string>()
  const uid = useId()
  const id = (name: string) => `${uid}-${name}`

  const {
    register,
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<Values>({ resolver: zodResolver(schema), defaultValues: defaultsFor(editing) })
  const emails = useFieldArray({ control, name: 'emails' })
  const [first, last] = useWatch({ control, name: ['firstName', 'lastName'] })

  // The same name means the same person: saving updates that contact instead of adding another (AT-05).
  const existing =
    !editing && first && last
      ? contacts.find((c) => sameName(c, { firstName: first, lastName: last }))
      : undefined

  const onSubmit = async (v: Values) => {
    setServerError(undefined)
    const emailsInput = v.emails.map((e) => ({
      address: e.address,
      type: e.type,
      provider: e.provider,
    }))
    try {
      if (editing) {
        await update.mutateAsync({
          id: editing.id,
          changes: {
            firstName: v.firstName,
            lastName: v.lastName,
            // an empty string clears the field on the server
            title: v.title,
            seniority: v.seniority,
            profileUrl: v.profileUrl,
            geography: v.geography,
            ...(v.matchConfidence ? { matchConfidence: v.matchConfidence as Confidence } : {}),
            source: v.source,
            emails: emailsInput,
          },
        })
        toast.success(`${v.firstName} ${v.lastName} was updated.`)
      } else {
        const input: ContactInput = {
          firstName: v.firstName,
          lastName: v.lastName,
          title: v.title || undefined,
          seniority: v.seniority || undefined,
          profileUrl: v.profileUrl || undefined,
          geography: v.geography || undefined,
          matchConfidence: (v.matchConfidence || undefined) as Confidence | undefined,
          source: v.source,
          emails: emailsInput,
        }
        await create.mutateAsync(input)
        toast.success(
          existing
            ? `${fullName(existing)} already existed, so that contact was updated.`
            : `${v.firstName} ${v.lastName} was added.`,
        )
      }
      onClose()
    } catch (error) {
      // e.g. an email on the opt-out list is refused with a plain explanation
      setServerError(error instanceof ApiError ? error.message : 'Something went wrong.')
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="flex flex-col gap-4">
      {serverError && (
        <div
          role="alert"
          className="flex items-start gap-2.5 rounded-lg border border-danger/25 bg-danger-soft px-3.5 py-2.5 text-sm text-danger-ink"
        >
          <TriangleAlert className="mt-0.5 size-4 shrink-0" aria-hidden />
          {serverError}
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="First name" htmlFor={id('first')} error={errors.firstName?.message}>
          <Input id={id('first')} autoFocus {...register('firstName')} />
        </Field>
        <Field label="Last name" htmlFor={id('last')} error={errors.lastName?.message}>
          <Input id={id('last')} {...register('lastName')} />
        </Field>
      </div>

      {existing && (
        <p
          role="status"
          className="flex items-start gap-2.5 rounded-lg border border-border bg-muted/50 px-3.5 py-2.5 text-sm"
        >
          <Info className="mt-0.5 size-4 shrink-0 text-muted-foreground" aria-hidden />
          <span>
            <strong>{fullName(existing)}</strong> is already on this company. Saving will update
            that contact. It will not add a second one.
          </span>
        </p>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Job title" htmlFor={id('title')}>
          <Input
            id={id('title')}
            placeholder="For example: Chief Technology Officer"
            {...register('title')}
          />
        </Field>
        <Field label="Seniority" htmlFor={id('seniority')}>
          <Select id={id('seniority')} {...register('seniority')}>
            <option value="">Not set</option>
            {SENIORITY_OPTIONS.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </Select>
        </Field>
      </div>

      <Field
        label="Profile address"
        htmlFor={id('profile')}
        error={errors.profileUrl?.message}
        hint="A link to their public profile. Only the address is stored."
      >
        <Input
          id={id('profile')}
          placeholder="https://www.linkedin.com/in/…"
          {...register('profileUrl')}
        />
      </Field>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Location" htmlFor={id('geo')}>
          <Input id={id('geo')} {...register('geography')} />
        </Field>
        <Field
          label="Match confidence"
          htmlFor={id('conf')}
          hint="How sure you are this is the right person."
        >
          <Select id={id('conf')} {...register('matchConfidence')}>
            {CONFIDENCE_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </Select>
        </Field>
      </div>

      <Field
        label="Where did you find this person?"
        htmlFor={id('source')}
        error={errors.source?.message}
      >
        <Select id={id('source')} {...register('source')}>
          {PROVIDER_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </Select>
      </Field>

      <fieldset className="flex flex-col gap-3 rounded-lg border border-border p-4">
        <legend className="px-1 text-[0.8125rem] font-medium text-foreground">
          Email addresses
        </legend>
        <p className="-mt-1 text-[0.8125rem] text-muted-foreground">
          Every email needs a source, so we always know where it came from. New emails start as
          &quot;Not checked&quot;.
        </p>
        {emails.fields.map((field, index) => {
          const err = errors.emails?.[index]
          return (
            <div
              key={field.id}
              className="grid gap-3 rounded-lg bg-muted/40 p-3 sm:grid-cols-[1fr_auto]"
            >
              <div className="grid gap-3 sm:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)_minmax(0,1.4fr)]">
                <Field
                  label={`Email ${index + 1}`}
                  htmlFor={id(`email-${index}`)}
                  error={err?.address?.message}
                >
                  <Input
                    id={id(`email-${index}`)}
                    type="email"
                    autoComplete="off"
                    {...register(`emails.${index}.address`)}
                  />
                </Field>
                <Field label={`Type of email ${index + 1}`} htmlFor={id(`type-${index}`)}>
                  <Select id={id(`type-${index}`)} {...register(`emails.${index}.type`)}>
                    <option value="business">Personal business email</option>
                    <option value="generic">General company inbox</option>
                  </Select>
                </Field>
                <Field
                  label={`Source of email ${index + 1}`}
                  htmlFor={id(`provider-${index}`)}
                  error={err?.provider?.message}
                >
                  <Select id={id(`provider-${index}`)} {...register(`emails.${index}.provider`)}>
                    <option value="">Choose a source…</option>
                    {PROVIDER_OPTIONS.map((o) => (
                      <option key={o.value} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                  </Select>
                </Field>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="self-start sm:mt-6"
                aria-label={`Remove email ${index + 1}`}
                onClick={() => emails.remove(index)}
              >
                <Trash2 className="size-4" aria-hidden />
              </Button>
            </div>
          )
        })}
        <div>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={() => emails.append({ address: '', type: 'business', provider: '' })}
          >
            <Plus className="size-4" aria-hidden />
            Add an email
          </Button>
        </div>
      </fieldset>

      <div className="flex justify-end gap-2">
        <Dialog.Close asChild>
          <Button variant="secondary" disabled={isSubmitting}>
            Cancel
          </Button>
        </Dialog.Close>
        <Button type="submit" loading={isSubmitting}>
          {editing ? 'Save changes' : existing ? 'Update contact' : 'Add contact'}
        </Button>
      </div>
    </form>
  )
}

/** Add a new contact, or edit one. The form is rebuilt each time it opens, so it never shows stale values. */
export function ContactForm({
  open,
  onOpenChange,
  companyId,
  contacts,
  editing,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  companyId: string
  contacts: Contact[]
  editing: Contact | undefined
}) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-foreground/45 backdrop-blur-[2px]" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-50 max-h-[calc(100vh-2rem)] w-[calc(100%-2rem)] max-w-2xl -translate-x-1/2 -translate-y-1/2 overflow-y-auto overscroll-contain rounded-xl border border-border bg-surface p-6 shadow-2xl">
          <div className="mb-5 flex items-start justify-between gap-4 border-b border-border/70 pb-4">
            <div>
              <Dialog.Title className="text-base font-semibold tracking-tight text-foreground">
                {editing ? `Edit ${fullName(editing)}` : 'Add a contact'}
              </Dialog.Title>
              <Dialog.Description className="mt-1 text-sm text-muted-foreground">
                Decision-makers you found for this company. Only business information is stored.
              </Dialog.Description>
            </div>
            <Dialog.Close asChild>
              <Button variant="ghost" size="icon" aria-label="Close">
                <X className="size-4" aria-hidden />
              </Button>
            </Dialog.Close>
          </div>
          {open && (
            <ContactFormInner
              companyId={companyId}
              contacts={contacts}
              editing={editing}
              onClose={() => onOpenChange(false)}
            />
          )}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
