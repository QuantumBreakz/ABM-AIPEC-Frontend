import { zodResolver } from '@hookform/resolvers/zod'
import * as Dialog from '@radix-ui/react-dialog'
import { TriangleAlert, X } from 'lucide-react'
import { useState } from 'react'
import { useForm, useWatch } from 'react-hook-form'
import { Link, useNavigate } from 'react-router'
import { toast } from 'sonner'
import { z } from 'zod'
import { ApiError } from '@/api/client'
import { useEvents } from '@/api/queries/events'
import { useRuns, useStartRun } from '@/api/queries/runs'
import type { Event, RunStep } from '@/api/types'
import { Skeleton } from '@/components/Skeleton'
import { Button } from '@/components/ui/button'
import { Select } from '@/components/ui/input'
import { isRunning, RUN_STEP_LABEL, RUN_STEPS } from '@/lib/runs'

const schema = z.object({
  edition: z.number({ error: 'Pick an edition.' }),
  steps: z.array(z.string()).min(1, 'Pick at least one step.'),
})
type Values = z.infer<typeof schema>

function StartRunFormInner({ events, onClose }: { events: Event[]; onClose: () => void }) {
  const navigate = useNavigate()
  const existing = useRuns(1)
  const start = useStartRun()
  const [serverError, setServerError] = useState<string>()

  const newest = Math.max(...events.map((e) => e.edition))
  const {
    register,
    handleSubmit,
    setValue,
    control,
    formState: { errors, isSubmitting },
  } = useForm<Values>({
    resolver: zodResolver(schema),
    // Everything is ticked by default: a normal run does every step.
    defaultValues: { edition: newest, steps: [...RUN_STEPS] },
  })
  const chosen = useWatch({ control, name: 'steps' }) ?? []
  const activeRun = existing.data?.items.find(isRunning)

  const onSubmit = async (values: Values) => {
    setServerError(undefined)
    try {
      const selected = RUN_STEPS.filter((s) => values.steps.includes(s))
      const run = await start.mutateAsync({
        edition: values.edition,
        // No list means "everything", which is what the backend does by default.
        steps: selected.length === RUN_STEPS.length ? undefined : (selected as RunStep[]),
      })
      toast.success(`Run ${run.id} started.`)
      onClose()
      navigate(`/runs/${run.id}`)
    } catch (error) {
      // 409 carries a ready-made sentence: "A run is already in progress..."
      setServerError(
        error instanceof ApiError ? error.message : 'Something went wrong. Please try again.',
      )
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="flex flex-col gap-5">
      {serverError && (
        <div
          role="alert"
          className="flex items-start gap-2.5 rounded-lg border border-danger/25 bg-danger-soft px-3.5 py-2.5 text-sm text-danger-ink"
        >
          <TriangleAlert className="mt-0.5 size-4 shrink-0" aria-hidden />
          <div>
            <p>{serverError}</p>
            {activeRun && (
              <Link
                to={`/runs/${activeRun.id}`}
                onClick={onClose}
                className="mt-1 inline-block font-medium underline underline-offset-2"
              >
                Open the run in progress ({activeRun.id})
              </Link>
            )}
          </div>
        </div>
      )}

      <div className="flex flex-col gap-1.5">
        <label htmlFor="run-edition" className="text-[0.8125rem] font-medium text-foreground">
          Edition
        </label>
        <Select id="run-edition" {...register('edition', { valueAsNumber: true })}>
          {events.map((event) => (
            <option key={event.id} value={event.edition}>
              {event.name}
            </option>
          ))}
        </Select>
        {errors.edition && (
          <p className="text-[0.8125rem] text-danger-ink">{errors.edition.message}</p>
        )}
      </div>

      <fieldset className="flex flex-col gap-2.5">
        <div className="flex items-center justify-between">
          <legend className="text-[0.8125rem] font-medium text-foreground">Steps to run</legend>
          <div className="flex gap-3 text-[0.8125rem]">
            <button
              type="button"
              className="cursor-pointer font-medium text-primary underline-offset-2 hover:underline"
              onClick={() => setValue('steps', [...RUN_STEPS], { shouldValidate: true })}
            >
              Select all
            </button>
            <button
              type="button"
              className="cursor-pointer font-medium text-primary underline-offset-2 hover:underline"
              onClick={() => setValue('steps', [], { shouldValidate: true })}
            >
              Select none
            </button>
          </div>
        </div>
        <ul className="grid gap-1.5 rounded-xl border border-border bg-muted/25 p-2 sm:grid-cols-2">
          {RUN_STEPS.map((step) => (
            <li key={step}>
              <label className="flex cursor-pointer items-center gap-2 rounded-lg px-2.5 py-1.5 text-sm transition-colors hover:bg-surface">
                <input
                  type="checkbox"
                  value={step}
                  className="size-4 accent-[var(--primary)]"
                  {...register('steps')}
                />
                {RUN_STEP_LABEL[step]}
              </label>
            </li>
          ))}
        </ul>
        <p className="text-[0.8125rem] text-muted-foreground">
          {chosen.length} of {RUN_STEPS.length} steps selected
        </p>
        {errors.steps && (
          <p role="alert" className="text-[0.8125rem] text-danger-ink">
            {errors.steps.message}
          </p>
        )}
      </fieldset>

      <div className="flex justify-end gap-2.5 border-t border-border/70 pt-4">
        <Dialog.Close asChild>
          <Button variant="secondary" disabled={isSubmitting}>
            Cancel
          </Button>
        </Dialog.Close>
        <Button type="submit" loading={isSubmitting}>
          Start run
        </Button>
      </div>
    </form>
  )
}

/** Waits for the list of editions, so the form can start with the newest one selected. */
function StartRunForm({ onClose }: { onClose: () => void }) {
  const events = useEvents()
  if (!events.data) return <Skeleton className="h-40" />
  return <StartRunFormInner events={events.data} onClose={onClose} />
}

/** Admin only: choose an edition and the steps, then start. The form is rebuilt each time it opens. */
export function StartRunDialog({
  open,
  onOpenChange,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-foreground/45 backdrop-blur-[2px]" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-50 max-h-[calc(100vh-2rem)] w-[calc(100%-2rem)] max-w-lg -translate-x-1/2 -translate-y-1/2 overflow-y-auto overscroll-contain rounded-xl border border-border bg-surface p-6 shadow-2xl">
          <div className="mb-5 flex items-start justify-between gap-4 border-b border-border/70 pb-4">
            <div>
              <Dialog.Title className="text-base font-semibold tracking-tight text-foreground">
                Start a run
              </Dialog.Title>
              <Dialog.Description className="mt-0.5 text-[0.8125rem] text-muted-foreground">
                Select edition and stages.
              </Dialog.Description>
            </div>
            <Dialog.Close asChild>
              <Button variant="ghost" size="icon" aria-label="Close">
                <X className="size-4" aria-hidden />
              </Button>
            </Dialog.Close>
          </div>
          {open && <StartRunForm onClose={() => onOpenChange(false)} />}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
