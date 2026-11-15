import { zodResolver } from '@hookform/resolvers/zod'
import { ArrowUpRight, Plus, TriangleAlert } from 'lucide-react'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { Link } from 'react-router'
import { toast } from 'sonner'
import { z } from 'zod'
import { ApiError } from '@/api/client'
import { useOverrideStep } from '@/api/queries/companies'
import type { Company, ReviewItem } from '@/api/types'
import { ContactForm } from '@/components/contacts/ContactForm'
import { DateTime } from '@/components/DateTime'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/input'

const schema = z.object({
  reason: z.string().trim().min(3, 'Give a short reason, so the next person knows why.'),
})

/**
 * A company that still has no contacts after review. Either add the people you find, go and look
 * in Sales Navigator, or record that none could be found (a company is valid without contacts).
 */
export function ContactsReview({
  company,
  item,
  onResolved,
}: {
  company: Company
  item: ReviewItem | undefined
  onResolved: () => void
}) {
  const override = useOverrideStep(company.id)
  const [formOpen, setFormOpen] = useState(false)
  const [error, setError] = useState<string>()
  const form = useForm<z.infer<typeof schema>>({
    resolver: zodResolver(schema),
    defaultValues: { reason: '' },
  })

  const markNone = form.handleSubmit(async ({ reason }) => {
    setError(undefined)
    try {
      await override.mutateAsync({
        step: 'people',
        status: 'completed',
        reason: `No contacts found: ${reason}`,
      })
      toast.success('Recorded that no contacts were found.')
      onResolved()
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Something went wrong.')
    }
  })

  const errors = form.formState.errors
  return (
    <div className="flex flex-col gap-6">
      {error && (
        <div
          role="alert"
          className="flex items-start gap-2 rounded-md bg-danger-soft px-3 py-2.5 text-sm text-danger-ink"
        >
          <TriangleAlert className="mt-0.5 size-4 shrink-0" aria-hidden />
          {error}
        </div>
      )}

      <dl className="grid gap-x-4 gap-y-2 rounded-xl border border-border bg-muted/35 p-4 text-sm sm:grid-cols-[8rem_minmax(0,1fr)]">
        <dt className="text-muted-foreground">Why it is here</dt>
        <dd>{item?.reason ?? company.stages.people.reason ?? 'No contacts saved yet.'}</dd>
        <dt className="text-muted-foreground">Contacts saved</dt>
        <dd>{company.contacts.length}</dd>
        {item && (
          <>
            <dt className="text-muted-foreground">Waiting since</dt>
            <dd>
              <DateTime value={item.since} />
            </dd>
          </>
        )}
      </dl>

      <section aria-label="Add the people you found" className="flex flex-col gap-2">
        <h3 className="text-sm font-semibold">Found someone?</h3>
        <div className="flex flex-wrap gap-2">
          <Button onClick={() => setFormOpen(true)}>
            <Plus className="size-4" aria-hidden />
            Add contact
          </Button>
          <Button asChild variant="secondary">
            <Link to={`/review/salesnav?item=${company.id}`}>
              Look in Sales Navigator
              <ArrowUpRight className="size-4" aria-hidden />
            </Link>
          </Button>
        </div>
        <ContactForm
          open={formOpen}
          onOpenChange={setFormOpen}
          companyId={company.id}
          contacts={company.contacts}
          editing={undefined}
        />
      </section>

      <hr className="border-border" />

      <form onSubmit={markNone} noValidate className="flex flex-col gap-2">
        <h3 className="text-sm font-semibold">No contacts found</h3>
        <label htmlFor="review-no-contacts" className="text-[13px] text-muted-foreground">
          Reason
        </label>
        <Textarea
          id="review-no-contacts"
          rows={3}
          placeholder="For example: a very small firm; no decision-makers are listed anywhere."
          aria-invalid={errors.reason ? true : undefined}
          aria-describedby={errors.reason ? 'review-no-contacts-error' : undefined}
          {...form.register('reason')}
        />
        {errors.reason && (
          <p id="review-no-contacts-error" role="alert" className="text-[13px] text-danger-ink">
            {errors.reason.message}
          </p>
        )}
        <div>
          <Button type="submit" variant="secondary" loading={form.formState.isSubmitting}>
            Mark as none found
          </Button>
        </div>
      </form>
    </div>
  )
}
