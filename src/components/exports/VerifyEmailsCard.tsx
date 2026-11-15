import { MailCheck, ShieldAlert } from 'lucide-react'
import { useEffect, useId, useRef, useState } from 'react'
import { Link } from 'react-router'
import { toast } from 'sonner'
import { useQueryClient } from '@tanstack/react-query'
import { ApiError } from '@/api/client'
import { useEvents } from '@/api/queries/events'
import { useOverview } from '@/api/queries/overview'
import { useProviders } from '@/api/queries/providers'
import { useRuns } from '@/api/queries/runs'
import { useHasInitialExport, useStartVerification } from '@/api/queries/verification'
import { ChartCard } from '@/components/charts/ChartCard'
import { ConfirmDialog } from '@/components/ConfirmDialog'
import { DateTime } from '@/components/DateTime'
import { ProgressBar } from '@/components/ProgressBar'
import { StatusBadge } from '@/components/StatusBadge'
import { Button } from '@/components/ui/button'
import { Select } from '@/components/ui/input'
import { formatNumber } from '@/lib/format'
import { isRunning, runPercent, stepProgress } from '@/lib/runs'

/**
 * Admin only. Checks every email that has never been checked, for one edition. Which checker is
 * used decides what the result can be, so the confirmation says so before anything starts.
 */
export function VerifyEmailsCard({ defaultEdition }: { defaultEdition?: number }) {
  const queryClient = useQueryClient()
  const selectId = useId()
  const events = useEvents()
  const providers = useProviders()
  const initial = useHasInitialExport()
  const runs = useRuns(1)
  const start = useStartVerification()
  const [chosen, setChosen] = useState<number>()
  const [confirming, setConfirming] = useState(false)

  const edition = chosen ?? defaultEdition ?? events.data?.[0]?.edition
  const overview = useOverview(edition)
  const toCheck = overview.data?.emailsByStatus.not_checked
  const hasChecker = providers.data?.millionverifier

  const latest = runs.data?.items.find(
    (r) => r.edition === edition && r.steps.length === 1 && r.steps[0] === 'verification',
  )
  const progress = latest ? stepProgress(latest, 'verification') : undefined

  // When a check finishes, the numbers on other screens are out of date.
  const lastStatus = useRef(latest?.status)
  useEffect(() => {
    if (lastStatus.current === 'running' && latest?.status === 'completed') {
      void queryClient.invalidateQueries({ queryKey: ['overview'] })
      void queryClient.invalidateQueries({ queryKey: ['companies'] })
      void queryClient.invalidateQueries({ queryKey: ['company'] })
      void queryClient.invalidateQueries({ queryKey: ['export-count'] })
      toast.success('The email check finished.')
    }
    lastStatus.current = latest?.status
  }, [latest?.status, queryClient])

  const running = latest?.status === 'running'
  // Only one run can be active at a time; the server refuses to start another.
  const otherRunActive = !running && !!runs.data?.items.some(isRunning)
  const blocker = !initial.data
    ? 'Download an initial export first. The check runs after that file exists.'
    : running
      ? 'A check is already running.'
      : otherRunActive
        ? 'Another run is in progress. Wait for it to finish, or pause it on the Runs page, then check the emails.'
        : toCheck === 0
          ? 'Every email in this edition has already been checked.'
          : undefined

  const run = async () => {
    if (edition === undefined) return
    try {
      await start.mutateAsync(edition)
      toast.success('The email check started.')
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : 'The email check could not be started.')
    } finally {
      setConfirming(false)
    }
  }

  return (
    <ChartCard
      title="4. Check the emails"
      subtitle="Admins only. Finds out which addresses can receive email, so the final file can say so."
    >
      <div className="flex flex-col gap-4">
        <div className="flex flex-wrap items-end gap-4">
          <div className="flex flex-col gap-1">
            <label htmlFor={selectId} className="text-[0.8125rem] font-medium">
              Edition
            </label>
            <Select
              id={selectId}
              value={edition ?? ''}
              onChange={(e) => setChosen(Number(e.target.value))}
              disabled={!events.data}
            >
              {events.data?.map((event) => (
                <option key={event.edition} value={event.edition}>
                  {event.name}
                </option>
              ))}
            </Select>
          </div>
          <Button
            onClick={() => setConfirming(true)}
            disabled={!!blocker || edition === undefined || providers.isPending}
          >
            <MailCheck className="size-4" aria-hidden />
            Check emails
          </Button>
        </div>

        <p className="text-sm">
          {toCheck === undefined ? (
            <span className="text-muted-foreground">Counting emails…</span>
          ) : (
            <>
              <strong className="tabular-nums">{formatNumber(toCheck)}</strong>{' '}
              {toCheck === 1 ? 'email has' : 'emails have'} not been checked yet.
            </>
          )}
        </p>
        {blocker && <p className="text-[0.8125rem] text-muted-foreground">{blocker}</p>}

        {latest && (
          <section
            aria-label="Latest email check"
            className="flex flex-col gap-2 rounded-xl border border-border bg-muted/35 p-4"
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2 text-sm font-semibold">
                Latest check
                <StatusBadge kind="run" status={latest.status} />
              </div>
              <Link
                to={`/runs/${latest.id}`}
                className="text-[0.8125rem] font-medium text-primary underline-offset-2 hover:underline"
              >
                Open run details
              </Link>
            </div>
            <ProgressBar wide value={runPercent(latest)} label="Email check progress" />
            <p className="text-[0.8125rem] text-muted-foreground">
              {progress
                ? `${formatNumber(progress.done)} checked, ${formatNumber(progress.queued)} waiting`
                : ''}
              {' · started '}
              <DateTime value={latest.createdAt} />
            </p>
          </section>
        )}
      </div>

      <ConfirmDialog
        open={confirming}
        onOpenChange={setConfirming}
        title="Check the emails?"
        confirmLabel="Start the check"
        pending={start.isPending}
        onConfirm={() => void run()}
      >
        {hasChecker ? (
          <p className="text-sm">
            <strong>MillionVerifier</strong> will check{' '}
            {toCheck === undefined ? 'the emails' : `${formatNumber(toCheck)} emails`} that were
            never checked. Each result is saved with the date and the checker used. An address is
            only marked Verified when this check confirms it.
          </p>
        ) : (
          <div className="flex items-start gap-2.5 rounded-lg border border-warning/30 bg-warning-soft px-3.5 py-2.5 text-sm text-warning-ink">
            <ShieldAlert className="mt-0.5 size-4 shrink-0" aria-hidden />
            <p>
              MillionVerifier is not set up, so the check can only look at each address&apos;s
              domain (MX). It <strong>cannot mark any email as Verified</strong>. Results will be
              Unknown, and the company&apos;s check step stays partial.
            </p>
          </div>
        )}
      </ConfirmDialog>
    </ChartCard>
  )
}
