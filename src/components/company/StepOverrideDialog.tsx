import { zodResolver } from '@hookform/resolvers/zod'
import * as Dialog from '@radix-ui/react-dialog'
import { TriangleAlert, X } from 'lucide-react'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { z } from 'zod'
import { ApiError } from '@/api/client'
import { useOverrideStep } from '@/api/queries/companies'
import type { StepKey, StepState, StepStatus } from '@/api/types'
import { STEP_STATUSES } from '@/api/types'
import { Button } from '@/components/ui/button'
import { Select, Textarea } from '@/components/ui/input'
import { STEP_LABEL, STEP_STATUS_META } from '@/lib/status'

const schema = z.object({
  status: z.string().refine((v) => STEP_STATUSES.includes(v as StepStatus), 'Pick a status.'),
  reason: z.string().trim().min(3, 'Give a short reason, so the next person knows why.'),
})
type Values = z.infer<typeof schema>

function OverrideForm({
  companyId,
  step,
  current,
  onClose,
}: {
  companyId: string
  step: StepKey
  current: StepState
  onClose: () => void
}) {
  const override = useOverrideStep(companyId)
  const [serverError, setServerError] = useState<string>()
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: { status: current.status, reason: '' },
  })

  const onSubmit = async (values: Values) => {
    setServerError(undefined)
    try {
      await override.mutateAsync({
        step,
        status: values.status as StepStatus,
        reason: values.reason.trim(),
      })
      toast.success(
        `${STEP_LABEL[step]} set to ${STEP_STATUS_META[values.status as StepStatus].label}.`,
      )
      onClose()
    } catch (error) {
      setServerError(error instanceof ApiError ? error.message : 'Something went wrong.')
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="flex flex-col gap-4">
      {serverError && (
        <div
          role="alert"
          className="flex items-start gap-2 rounded-md bg-danger-soft px-3 py-2.5 text-sm text-danger-ink"
        >
          <TriangleAlert className="mt-0.5 size-4 shrink-0" aria-hidden />
          {serverError}
        </div>
      )}
      <p className="text-[13px] text-muted-foreground">
        Currently{' '}
        <strong className="text-foreground">{STEP_STATUS_META[current.status].label}</strong>.
        {current.reason && <span className="block">Recorded reason: {current.reason}</span>}
        <span className="mt-1 block">Overrides are logged in History.</span>
      </p>
      <div className="flex flex-col gap-1.5">
        <label htmlFor="override-status" className="text-sm font-medium">
          New status
        </label>
        <Select id="override-status" {...register('status')}>
          {STEP_STATUSES.map((status) => (
            <option key={status} value={status}>
              {STEP_STATUS_META[status].label}
            </option>
          ))}
        </Select>
        {errors.status && <p className="text-[13px] text-danger-ink">{errors.status.message}</p>}
      </div>
      <div className="flex flex-col gap-1.5">
        <label htmlFor="override-reason" className="text-sm font-medium">
          Reason
        </label>
        <Textarea
          id="override-reason"
          rows={3}
          placeholder="For example: checked the website by hand, it has no contact page."
          aria-invalid={errors.reason ? true : undefined}
          aria-describedby={errors.reason ? 'override-reason-error' : undefined}
          {...register('reason')}
        />
        {errors.reason && (
          <p id="override-reason-error" role="alert" className="text-[13px] text-danger-ink">
            {errors.reason.message}
          </p>
        )}
      </div>
      <div className="flex justify-end gap-2">
        <Dialog.Close asChild>
          <Button variant="secondary" disabled={isSubmitting}>
            Cancel
          </Button>
        </Dialog.Close>
        <Button type="submit" loading={isSubmitting}>
          Change status
        </Button>
      </div>
    </form>
  )
}

/** Set a step's status by hand. A reason is required, because the change is recorded. */
export function StepOverrideDialog({
  companyId,
  step,
  current,
  onOpenChange,
}: {
  companyId: string
  /** The step being changed, or null when the dialog is closed. */
  step: StepKey | null
  current: StepState
  onOpenChange: (open: boolean) => void
}) {
  return (
    <Dialog.Root open={step !== null} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-foreground/40 backdrop-blur-[1px]" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-50 max-h-[calc(100vh-2rem)] w-[calc(100%-2rem)] max-w-md -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-lg border border-border bg-surface p-6 shadow-xl">
          <div className="mb-4 flex items-start justify-between gap-4">
            <div>
              <Dialog.Title className="text-base font-semibold">
                Change status{step ? `: ${STEP_LABEL[step]}` : ''}
              </Dialog.Title>
              <Dialog.Description className="sr-only">
                Pick a new status and explain why.
              </Dialog.Description>
            </div>
            <Dialog.Close asChild>
              <Button variant="ghost" size="icon" aria-label="Close">
                <X className="size-4" aria-hidden />
              </Button>
            </Dialog.Close>
          </div>
          {step && (
            <OverrideForm
              companyId={companyId}
              step={step}
              current={current}
              onClose={() => onOpenChange(false)}
            />
          )}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
