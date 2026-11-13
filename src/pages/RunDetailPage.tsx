import { ArrowLeft, CirclePause, Play, TriangleAlert } from 'lucide-react'
import { useState } from 'react'
import { Link, useParams } from 'react-router'
import { ApiError } from '@/api/client'
import { usePauseRun, useResumeRun, useRun } from '@/api/queries/runs'
import type { Run } from '@/api/types'
import { useMe } from '@/auth/auth-context'
import { ChartCard } from '@/components/charts/ChartCard'
import { StatTile } from '@/components/charts/StatTile'
import { DateTime } from '@/components/DateTime'
import { ErrorState } from '@/components/ErrorState'
import { PageHeader } from '@/components/PageHeader'
import { ProgressBar } from '@/components/ProgressBar'
import { RunErrors } from '@/components/runs/RunErrors'
import { RunStepBars } from '@/components/runs/RunStepBars'
import { Skeleton } from '@/components/Skeleton'
import { StatusBadge } from '@/components/StatusBadge'
import { Button } from '@/components/ui/button'
import { formatNumber } from '@/lib/format'
import { runPercent } from '@/lib/runs'

const COUNTS: { key: keyof Run['counts']; label: string }[] = [
  { key: 'discovered', label: 'Discovered' },
  { key: 'attempted', label: 'Attempted' },
  { key: 'completed', label: 'Completed' },
  { key: 'partial', label: 'Partial' },
  { key: 'restricted', label: 'Restricted' },
  { key: 'failed', label: 'Failed' },
  { key: 'duplicate', label: 'Duplicates' },
]

function LiveNote({ status }: { status: Run['status'] }) {
  if (status === 'running') {
    return (
      <p className="inline-flex items-center gap-2 rounded-full bg-info-soft px-3 py-1 text-xs font-medium text-info-ink">
        <span aria-hidden className="size-2 animate-pulse rounded-full bg-info" />
        Updating every 5 seconds
      </p>
    )
  }
  if (status === 'paused') {
    return (
      <p className="rounded-full bg-muted px-3 py-1 text-xs font-medium text-muted-foreground">
        Paused. This page stops updating until the run is resumed.
      </p>
    )
  }
  return null
}

export default function RunDetailPage() {
  const { id } = useParams()
  const { isAdmin } = useMe()
  const run = useRun(id)
  const pause = usePauseRun()
  const resume = useResumeRun()
  const [actionError, setActionError] = useState<string>()

  const act = async (kind: 'pause' | 'resume') => {
    setActionError(undefined)
    try {
      await (kind === 'pause' ? pause : resume).mutateAsync(id as string)
    } catch (error) {
      // e.g. 409 when resuming while another run is already working
      setActionError(error instanceof ApiError ? error.message : 'Something went wrong.')
    }
  }

  const back = (
    <Button asChild variant="ghost" size="sm" className="-ml-2 mb-3">
      <Link to="/runs">
        <ArrowLeft className="size-4" aria-hidden />
        All runs
      </Link>
    </Button>
  )

  if (run.isPending) {
    return (
      <>
        {back}
        <div role="status" className="flex flex-col gap-4" aria-busy="true">
          <span className="sr-only">Loading run…</span>
          <Skeleton className="h-10 w-64" />
          <Skeleton className="h-32 rounded-xl" />
          <Skeleton className="h-64 rounded-xl" />
        </div>
      </>
    )
  }

  if (run.error || !run.data) {
    return (
      <>
        {back}
        <div className="card-elevated">
          <ErrorState error={run.error} onRetry={() => void run.refetch()} />
        </div>
      </>
    )
  }

  const data = run.data
  const finished = data.status === 'completed' || data.status === 'failed'

  return (
    <>
      {back}
      <PageHeader
        title={`Run ${data.id}`}
        description={`Edition ${data.edition}, started by ${data.startedBy}`}
        actions={
          isAdmin && data.status === 'running' ? (
            <Button variant="secondary" loading={pause.isPending} onClick={() => void act('pause')}>
              <CirclePause className="size-4" aria-hidden />
              Pause run
            </Button>
          ) : isAdmin && data.status === 'paused' ? (
            <Button loading={resume.isPending} onClick={() => void act('resume')}>
              <Play className="size-4" aria-hidden />
              Resume run
            </Button>
          ) : undefined
        }
      />

      {actionError && (
        <div
          role="alert"
          className="mb-4 flex items-start gap-2.5 rounded-xl border border-danger/25 bg-danger-soft px-4 py-3 text-sm text-danger-ink"
        >
          <TriangleAlert className="mt-0.5 size-4 shrink-0" aria-hidden />
          {actionError}
        </div>
      )}

      <div className="flex flex-col gap-6">
        <section aria-label="Run summary" className="card-elevated p-5 sm:p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-3">
              <StatusBadge kind="run" status={data.status} />
              <span className="text-[0.8125rem] text-muted-foreground">
                Started <DateTime value={data.createdAt} />
                {finished && data.finishedAt && (
                  <>
                    {' '}
                    · Finished <DateTime value={data.finishedAt} />
                  </>
                )}
              </span>
            </div>
            <LiveNote status={data.status} />
          </div>
          <div className="mt-4 text-base">
            <ProgressBar value={runPercent(data)} label="Run progress" wide />
          </div>
        </section>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-7">
          {COUNTS.map(({ key, label }) => (
            <StatTile key={key} label={label} value={formatNumber(data.counts[key])} />
          ))}
        </div>

        <ChartCard
          title="Progress by step"
          subtitle="How many companies each step has finished, failed or still has waiting."
        >
          <RunStepBars run={data} />
        </ChartCard>

        <ChartCard
          title={`Errors (${data.errors.length})`}
          subtitle="The most recent problems this run ran into, newest first. Up to the last 100 are kept."
        >
          <RunErrors errors={data.errors} />
        </ChartCard>
      </div>
    </>
  )
}
