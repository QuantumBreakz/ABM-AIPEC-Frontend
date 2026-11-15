import { zodResolver } from '@hookform/resolvers/zod'
import { Ban, Plus, Trash2 } from 'lucide-react'
import { useId, useState } from 'react'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { z } from 'zod'
import { ApiError } from '@/api/client'
import { useAddSuppression, useDeleteSuppression, useSuppressions } from '@/api/queries/admin'
import type { Suppression } from '@/api/types'
import { ChartCard } from '@/components/charts/ChartCard'
import { ConfirmDialog } from '@/components/ConfirmDialog'
import { DateTime } from '@/components/DateTime'
import { EmptyState } from '@/components/EmptyState'
import { ErrorState } from '@/components/ErrorState'
import { NotAvailable } from '@/components/NotAvailable'
import { PageHeader } from '@/components/PageHeader'
import { Skeleton } from '@/components/Skeleton'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { EMAIL_RE } from '@/lib/contacts'

const DOMAIN_RE = /^(?!-)[a-z0-9-]+(\.[a-z0-9-]+)+$/i

const schema = z.object({
  value: z
    .string()
    .trim()
    .min(1, 'Enter an email address or a domain.')
    .refine(
      (v) => EMAIL_RE.test(v) || DOMAIN_RE.test(v),
      'Enter an email address, or a domain such as example.com.',
    ),
  reason: z.string().trim().optional(),
})

const kindOf = (value: string) => (value.includes('@') ? 'Email address' : 'Whole domain')

export default function SuppressionsPage() {
  const id = useId()
  const list = useSuppressions()
  const add = useAddSuppression()
  const remove = useDeleteSuppression()
  const [deleting, setDeleting] = useState<Suppression>()
  const [serverError, setServerError] = useState<string>()
  const form = useForm<z.infer<typeof schema>>({
    resolver: zodResolver(schema),
    defaultValues: { value: '', reason: '' },
  })
  const { errors } = form.formState

  const submit = form.handleSubmit(async (values) => {
    setServerError(undefined)
    try {
      await add.mutateAsync({ value: values.value, reason: values.reason || undefined })
      toast.success(`${values.value.toLowerCase()} will not be contacted.`)
      form.reset()
    } catch (e) {
      setServerError(e instanceof ApiError ? e.message : 'It could not be added.')
    }
  })

  const confirmDelete = async () => {
    if (!deleting) return
    try {
      await remove.mutateAsync(deleting.id)
      toast.success(`${deleting.value} was removed from the list.`)
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : 'It could not be removed.')
    } finally {
      setDeleting(undefined)
    }
  }

  return (
    <>
      <PageHeader
        title="Suppressions"
        description="Emails and domains that opted out. They cannot be saved as contacts and are left out of exports."
      />

      <div className="flex flex-col gap-6">
        <ChartCard title="Add to the list">
          <form
            onSubmit={submit}
            noValidate
            className="grid gap-3 sm:grid-cols-[minmax(0,1.2fr)_minmax(0,1.6fr)_auto] sm:items-start"
          >
            <div className="flex flex-col gap-1">
              <label htmlFor={`${id}-value`} className="text-[0.8125rem] font-medium">
                Email or domain
              </label>
              <Input
                id={`${id}-value`}
                placeholder="name@example.com or example.com"
                aria-invalid={errors.value ? true : undefined}
                {...form.register('value')}
              />
              {errors.value && (
                <p role="alert" className="text-[13px] text-danger-ink">
                  {errors.value.message}
                </p>
              )}
            </div>
            <div className="flex flex-col gap-1">
              <label htmlFor={`${id}-reason`} className="text-[0.8125rem] font-medium">
                Reason (optional)
              </label>
              <Input
                id={`${id}-reason`}
                placeholder="For example: asked not to be contacted"
                {...form.register('reason')}
              />
            </div>
            <Button type="submit" className="sm:mt-6" loading={form.formState.isSubmitting}>
              <Plus className="size-4" aria-hidden />
              Add
            </Button>
            {serverError && (
              <p role="alert" className="text-[13px] text-danger-ink sm:col-span-3">
                {serverError}
              </p>
            )}
          </form>
        </ChartCard>

        <ChartCard title={`Suppressed (${list.data?.length ?? 0})`}>
          {list.isPending ? (
            <div role="status" aria-busy="true" className="flex flex-col gap-2">
              <span className="sr-only">Loading…</span>
              <Skeleton className="h-10" />
              <Skeleton className="h-10" />
            </div>
          ) : list.error ? (
            <ErrorState error={list.error} onRetry={() => void list.refetch()} />
          ) : list.data.length === 0 ? (
            <EmptyState
              icon={Ban}
              title="Nobody is suppressed"
              hint="Add an address or domain when someone asks not to be contacted."
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-[0.8125rem]">
                <caption className="sr-only">Suppressed emails and domains</caption>
                <thead>
                  <tr className="border-b border-border text-muted-foreground">
                    <th scope="col" className="py-2 pr-4 font-medium">
                      Value
                    </th>
                    <th scope="col" className="px-3 py-2 font-medium">
                      Applies to
                    </th>
                    <th scope="col" className="px-3 py-2 font-medium">
                      Reason
                    </th>
                    <th scope="col" className="px-3 py-2 font-medium">
                      Added
                    </th>
                    <th scope="col" className="py-2 pl-3 text-right font-medium">
                      <span className="sr-only">Actions</span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {list.data.map((item) => (
                    <tr key={item.id} className="border-b border-border last:border-0">
                      <th scope="row" className="py-3 pr-4 text-left font-mono font-normal">
                        {item.value}
                      </th>
                      <td className="px-3 py-3">{kindOf(item.value)}</td>
                      <td className="px-3 py-3">
                        {item.reason ?? <NotAvailable label="No reason recorded" />}
                      </td>
                      <td className="px-3 py-3">
                        <DateTime value={item.at} />
                      </td>
                      <td className="py-3 pl-3">
                        <div className="flex justify-end">
                          <Button
                            variant="ghost"
                            size="icon"
                            aria-label={`Remove ${item.value}`}
                            onClick={() => setDeleting(item)}
                          >
                            <Trash2 className="size-4" aria-hidden />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </ChartCard>
      </div>

      <ConfirmDialog
        open={!!deleting}
        onOpenChange={(open) => !open && setDeleting(undefined)}
        title={deleting ? `Remove ${deleting.value}?` : 'Remove from the list?'}
        description="This address or domain can be saved and contacted again. Only do this if the person agreed."
        confirmLabel="Remove"
        destructive
        pending={remove.isPending}
        onConfirm={() => void confirmDelete()}
      />
    </>
  )
}
