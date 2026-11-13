import { Activity, Plus } from 'lucide-react'
import { useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router'
import { useRuns } from '@/api/queries/runs'
import type { Run } from '@/api/types'
import { useMe } from '@/auth/auth-context'
import { type Columns, DataTable } from '@/components/DataTable'
import { DateTime } from '@/components/DateTime'
import { EmptyState } from '@/components/EmptyState'
import { NotAvailable } from '@/components/NotAvailable'
import { PageHeader } from '@/components/PageHeader'
import { ProgressBar } from '@/components/ProgressBar'
import { StartRunDialog } from '@/components/runs/StartRunDialog'
import { StatusBadge } from '@/components/StatusBadge'
import { Button } from '@/components/ui/button'
import { formatNumber } from '@/lib/format'
import { runPercent } from '@/lib/runs'

const columns: Columns<Run> = [
  {
    id: 'id',
    header: 'Run',
    enableHiding: false,
    cell: ({ row }) => (
      <Link
        to={`/runs/${row.original.id}`}
        className="font-mono text-[13px] font-medium underline-offset-2 hover:underline"
      >
        {row.original.id}
      </Link>
    ),
  },
  { id: 'edition', header: 'Edition', cell: ({ row }) => row.original.edition },
  {
    id: 'status',
    header: 'Status',
    cell: ({ row }) => <StatusBadge kind="run" status={row.original.status} />,
  },
  {
    id: 'progress',
    header: 'Progress',
    cell: ({ row }) => <ProgressBar value={runPercent(row.original)} label="Run progress" />,
  },
  {
    id: 'companies',
    header: 'Companies',
    cell: ({ row }) => (
      <span className="tabular-nums">{formatNumber(row.original.counts.discovered)}</span>
    ),
  },
  {
    id: 'failed',
    header: 'Failed',
    cell: ({ row }) => (
      <span className="tabular-nums">{formatNumber(row.original.counts.failed)}</span>
    ),
  },
  {
    id: 'started',
    header: 'Started',
    cell: ({ row }) => <DateTime value={row.original.createdAt} />,
  },
  {
    id: 'finished',
    header: 'Finished',
    cell: ({ row }) =>
      row.original.finishedAt ? (
        <DateTime value={row.original.finishedAt} />
      ) : (
        <span className="text-muted-foreground">Not yet</span>
      ),
  },
  {
    id: 'by',
    header: 'Started by',
    cell: ({ row }) =>
      row.original.startedBy ? (
        <span className="block max-w-40 truncate" title={row.original.startedBy}>
          {row.original.startedBy}
        </span>
      ) : (
        <NotAvailable />
      ),
  },
]

export default function RunsPage() {
  const navigate = useNavigate()
  const { isAdmin } = useMe()
  const [params, setParams] = useSearchParams()
  const [starting, setStarting] = useState(false)

  const rawPage = Number(params.get('page'))
  const page = Number.isInteger(rawPage) && rawPage >= 1 ? rawPage : 1
  const setPage = (next: number) =>
    setParams((prev) => {
      const out = new URLSearchParams(prev)
      if (next <= 1) out.delete('page')
      else out.set('page', String(next))
      return out
    })

  const runs = useRuns(page)
  const running = runs.data?.items.some((r) => r.status === 'running')

  return (
    <>
      <PageHeader
        title="Runs"
        description="Pipeline execution history"
        actions={
          isAdmin && (
            <Button onClick={() => setStarting(true)}>
              <Plus className="size-4" aria-hidden />
              Start run
            </Button>
          )
        }
      />
      {running && (
        <p className="mb-3 flex items-center gap-2 text-[0.8125rem] font-medium text-info-ink">
          <span aria-hidden className="size-2 animate-pulse rounded-full bg-info" />A run is in
          progress · Live
        </p>
      )}
      <DataTable
        columns={columns}
        data={runs.data?.items}
        getRowId={(r) => r.id}
        isLoading={runs.isPending}
        isFetching={runs.isFetching}
        error={runs.error}
        onRetry={() => void runs.refetch()}
        page={page}
        pageSize={runs.data?.pageSize ?? 50}
        total={runs.data?.total}
        onPageChange={setPage}
        onRowClick={(r) => navigate(`/runs/${r.id}`)}
        rowLabel={(r) => `Open run ${r.id}`}
        empty={
          <EmptyState
            icon={Activity}
            title="No runs yet"
            hint={
              isAdmin
                ? 'Start a run to read the exhibitor directory and research each company.'
                : 'An admin starts runs. They will show up here.'
            }
            action={
              isAdmin ? (
                <Button onClick={() => setStarting(true)}>
                  <Plus className="size-4" aria-hidden />
                  Start run
                </Button>
              ) : undefined
            }
          />
        }
      />
      {isAdmin && <StartRunDialog open={starting} onOpenChange={setStarting} />}
    </>
  )
}
