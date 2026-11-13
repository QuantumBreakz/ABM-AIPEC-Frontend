import { zodResolver } from '@hookform/resolvers/zod'
import { TriangleAlert } from 'lucide-react'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { z } from 'zod'
import { ApiError } from '@/api/client'
import { useOverrideStep } from '@/api/queries/companies'
import { useResolveWebsite } from '@/api/queries/review'
import type { Company } from '@/api/types'
import { NotAvailable } from '@/components/NotAvailable'
import { SourceLink } from '@/components/SourceLink'
import { StatusBadge } from '@/components/StatusBadge'
import { Button } from '@/components/ui/button'
import { Input, Textarea } from '@/components/ui/input'
import { safeHttpUrl } from '@/lib/format'
import { URL_MESSAGE } from '@/lib/patch'

const urlSchema = z.object({
  url: z
    .string()
    .trim()
    .refine((v) => !!safeHttpUrl(v), URL_MESSAGE),
})
const noSiteSchema = z.object({
  reason: z.string().trim().min(3, 'Give a short reason, so the next person knows why.'),
})

function Failure({ message }: { message: string }) {
  return (
    <div
      role="alert"
      className="flex items-start gap-2 rounded-md bg-danger-soft px-3 py-2.5 text-sm text-danger-ink"
    >
      <TriangleAlert className="mt-0.5 size-4 shrink-0" aria-hidden />
      {message}
    </div>
  )
}

/** Fix the official website: type the right address, or say that the company has none. */
export function WebsiteReview({
  company,
  onResolved,
}: {
  company: Company
  onResolved: () => void
}) {
  const resolve = useResolveWebsite(company.id)
  const override = useOverrideStep(company.id)
  const [error, setError] = useState<string>()
  const message = (e: unknown) => (e instanceof ApiError ? e.message : 'Something went wrong.')

  const urlForm = useForm<z.infer<typeof urlSchema>>({
    resolver: zodResolver(urlSchema),
    defaultValues: { url: company.website.url ?? '' },
  })
  const noSiteForm = useForm<z.infer<typeof noSiteSchema>>({
    resolver: zodResolver(noSiteSchema),
    defaultValues: { reason: '' },
  })

  const saveUrl = urlForm.handleSubmit(async ({ url }) => {
    setError(undefined)
    try {
      await resolve.mutateAsync(url)
      toast.success('Website saved. It is now waiting to be researched.')
      onResolved()
    } catch (e) {
      setError(message(e))
    }
  })

  const markNoWebsite = noSiteForm.handleSubmit(async ({ reason }) => {
    setError(undefined)
    try {
      await override.mutateAsync({
        step: 'website',
        status: 'completed',
        reason: `No website: ${reason}`,
      })
      toast.success('Marked as having no website.')
      onResolved()
    } catch (e) {
      setError(message(e))
    }
  })

  const site = company.website
  return (
    <div className="flex flex-col gap-6">
      {error && <Failure message={error} />}

      <section
        aria-label="What we know"
        className="rounded-lg border border-border bg-muted/40 p-4"
      >
        <h3 className="mb-2 text-sm font-semibold">What we know</h3>
        <dl className="grid gap-x-4 gap-y-2 text-sm sm:grid-cols-[8rem_minmax(0,1fr)]">
          <dt className="text-muted-foreground">Website step</dt>
          <dd>
            <StatusBadge kind="step" status={company.stages.website.status} />
          </dd>
          <dt className="text-muted-foreground">Recorded reason</dt>
          <dd>{company.stages.website.reason ?? <NotAvailable />}</dd>
          <dt className="text-muted-foreground">Current address</dt>
          <dd>{site.url ? <SourceLink href={site.url} /> : <NotAvailable label="None set" />}</dd>
          {site.skipped[0] && (
            <>
              <dt className="text-muted-foreground">Last attempt</dt>
              <dd>{site.skipped[0].reason}</dd>
            </>
          )}
        </dl>
      </section>

      <form onSubmit={saveUrl} noValidate className="flex flex-col gap-2">
        <h3 className="text-sm font-semibold">Set the official website</h3>
        <label htmlFor="review-url" className="text-[13px] text-muted-foreground">
          Website address
        </label>
        <Input
          id="review-url"
          placeholder="https://www.example.com"
          aria-invalid={urlForm.formState.errors.url ? true : undefined}
          aria-describedby={urlForm.formState.errors.url ? 'review-url-error' : undefined}
          {...urlForm.register('url')}
        />
        {urlForm.formState.errors.url && (
          <p id="review-url-error" role="alert" className="text-[13px] text-danger-ink">
            {urlForm.formState.errors.url.message}
          </p>
        )}
        <div>
          <Button type="submit" loading={urlForm.formState.isSubmitting}>
            Save website
          </Button>
        </div>
      </form>

      <hr className="border-border" />

      <form onSubmit={markNoWebsite} noValidate className="flex flex-col gap-2">
        <h3 className="text-sm font-semibold">Or: this company has no website</h3>
        <label htmlFor="review-no-site" className="text-[13px] text-muted-foreground">
          Reason
        </label>
        <Textarea
          id="review-no-site"
          rows={3}
          placeholder="For example: a small local firm that only has a LinkedIn page."
          aria-invalid={noSiteForm.formState.errors.reason ? true : undefined}
          aria-describedby={noSiteForm.formState.errors.reason ? 'review-no-site-error' : undefined}
          {...noSiteForm.register('reason')}
        />
        {noSiteForm.formState.errors.reason && (
          <p id="review-no-site-error" role="alert" className="text-[13px] text-danger-ink">
            {noSiteForm.formState.errors.reason.message}
          </p>
        )}
        <div>
          <Button type="submit" variant="secondary" loading={noSiteForm.formState.isSubmitting}>
            Mark as no website
          </Button>
        </div>
      </form>
    </div>
  )
}
