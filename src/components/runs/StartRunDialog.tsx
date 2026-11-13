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
          className="flex items-start gap-2 rounded-md bg-danger-soft px-3 py-2.5 text-sm text-danger-ink"
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
        <label htmlFor="run-edition" className="text-sm font-medium">
          Edition
        </label>
        <Select id="run-edition" {...register('edition', { valueAsNumber: true })}>
          {events.map((event) => (
            <option key={event.id} value={event.edition}>
              {event.name}
            </option>
          ))}
        </Select>
        {errors.edition && <p className="text-[13px] text-danger-ink">{errors.edition.message}</p>}
      </div>

      <fieldset className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <legend className="text-sm font-medium">Steps to run</legend>
          <div className="flex gap-3 text-[13px]">
            <button
              type="button"
              className="font-medium text-primary underline-offset-2 hover:underline"
              onClick={() => setValue('steps', [...RUN_STEPS], { shouldValidate: true })}
            >
              Select all
            </button>
            <button
              type="button"
              className="font-medium text-primary underline-offset-2 hover:underline"
              onClick={() => setValue('steps', [], { shouldValidate: true })}
            >
              Select none
            </button>
          </div>
        </div>
        <ul className="grid gap-1 sm:grid-cols-2">
          {RUN_STEPS.map((step) => (
            <li key={step}>
              <label className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-muted">
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
        <p className="text-[13px] text-muted-foreground">
          {chosen.length} of {RUN_STEPS.length} steps selected. Leave them all ticked for a normal
          run.
        </p>
        {errors.steps && (
          <p role="alert" className="text-[13px] text-danger-ink">
            {errors.steps.message}
          </p>
        )}
      </fieldset>

      <div className="flex justify-end gap-2">
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
        <Dialog.Overlay className="fixed inset-0 z-40 bg-foreground/40 backdrop-blur-[1px]" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-50 max-h-[calc(100vh-2rem)] w-[calc(100%-2rem)] max-w-lg -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-lg border border-border bg-surface p-6 shadow-xl">
          <div className="mb-5 flex items-start justify-between gap-4">
            <div>
              <Dialog.Title className="text-base font-semibold">Start a run</Dialog.Title>
              <Dialog.Description className="mt-1 text-muted-foreground">
                A run reads the exhibitor directory and researches each company. Only one run can
                work at a time.
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
