import { Download, PartyPopper } from 'lucide-react'
import { useState } from 'react'
import { Link, useSearchParams } from 'react-router'
import { toast } from 'sonner'
import { ApiError } from '@/api/client'
import { useEvents } from '@/api/queries/events'
import { useDownloadGapCsv, useGapReport } from '@/api/queries/reports'
import type { GapReport } from '@/api/types'
import { ChartCard } from '@/components/charts/ChartCard'
import { StatTile } from '@/components/charts/StatTile'
import { StepStackChart } from '@/components/charts/StepStackChart'
import { type Columns, DataTable } from '@/components/DataTable'
import { EmptyState } from '@/components/EmptyState'
import { ErrorState } from '@/components/ErrorState'
import { NotAvailable } from '@/components/NotAvailable'
import { PageHeader } from '@/components/PageHeader'
import { Skeleton } from '@/components/Skeleton'
import { StatusBadge } from '@/components/StatusBadge'
import { Button } from '@/components/ui/button'
import { Select } from '@/components/ui/input'
import { formatNumber } from '@/lib/format'
import { STEP_LABEL } from '@/lib/status'

type Blocked = GapReport['blocked'][number]

const PAGE_SIZE = 25

const columns: Columns<Blocked> = [
  {
    id: 'company',
    header: 'Company',
    enableHiding: false,
    cell: ({ row }) => (
      <Link
        to={`/companies/${row.original.companyId}`}
        className="font-medium underline-offset-2 hover:underline"
      >
        {row.original.companyName}
      </Link>
    ),
  },
  { id: 'step', header: 'Step', cell: ({ row }) => STEP_LABEL[row.original.step] },
  {
    id: 'status',
    header: 'Status',
    cell: ({ row }) => <StatusBadge kind="step" status={row.original.status} />,
  },
  {
    id: 'reason',
    header: 'Reason',
    cell: ({ row }) =>
      row.original.reason ? (
        <span className="block max-w-xl whitespace-normal">{row.original.reason}</span>
      ) : (
        <NotAvailable label="No reason recorded" />
      ),
  },
]

export default function GapReportPage() {
  const [params, setParams] = useSearchParams()
  const events = useEvents()
  const requested = Number(params.get('edition'))
  const edition =
    Number.isFinite(requested) && requested > 0 ? requested : events.data?.[0]?.edition
  const report = useGapReport(edition)
  const download = useDownloadGapCsv()
  // The page belongs to an edition, so choosing another edition starts again on page 1.
  const [paging, setPaging] = useState({ edition, page: 1 })
  const page = paging.edition === edition ? paging.page : 1
  const setPage = (next: number) => setPaging({ edition, page: next })

  const data = report.data
  const blocked = data?.blocked.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  const save = async () => {
    if (edition === undefined) return
    try {
      const filename = await download.mutateAsync(edition)
      toast.success(`${filename} was downloaded.`)
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : 'The file could not be downloaded.')
    }
  }

  return (
    <>
      <PageHeader
        title="Gap report"
        description="What is finished, what is stuck, and why. Nothing is hidden or guessed."
        actions={
          <>
            {events.data && events.data.length > 0 && (
              <div className="flex w-full items-center gap-2.5 sm:w-auto">
                <label
                  htmlFor="gap-edition"
                  className="shrink-0 whitespace-nowrap text-[0.8125rem] font-medium text-muted-foreground"
                >
                  Edition
                </label>
                <Select
                  id="gap-edition"
                  className="w-full sm:w-44"
                  value={edition ?? ''}
                  onChange={(e) =>
                    setParams((prev) => {
                      const next = new URLSearchParams(prev)
                      next.set('edition', e.target.value)
                      return next
                    })
                  }
                >
                  {events.data.map((event) => (
                    <option key={event.id} value={event.edition}>
                      {event.name}
                    </option>
                  ))}
                </Select>
              </div>
            )}
            <Button
              variant="secondary"
              onClick={() => void save()}
              loading={download.isPending}
              disabled={!data}
            >
              <Download className="size-4" aria-hidden />
              Download CSV
            </Button>
          </>
        }
      />

      {(events.error || report.error) && (
        <div className="card-elevated">
          <ErrorState
            error={events.error ?? report.error}
            onRetry={() => {
              void events.refetch()
              void report.refetch()
            }}
          />
        </div>
      )}

      {!events.error && !report.error && events.data?.length === 0 && (
        <div className="card-elevated">
          <EmptyState
            icon={PartyPopper}
            title="No editions configured yet"
            hint="Start a run or create an edition to generate a gap report."
            action={
              <Button asChild variant="secondary">
                <Link to="/runs">Go to runs</Link>
              </Button>
            }
          />
        </div>
      )}

      {!events.error && !report.error && events.data?.length !== 0 && !data && (
        <div role="status" aria-busy="true" className="grid gap-4 sm:grid-cols-3">
          <span className="sr-only">Loading…</span>
          <Skeleton className="h-28" />
          <Skeleton className="h-28" />
          <Skeleton className="h-28" />
        </div>
      )}

      {data && !report.error && (
        <div className="flex flex-col gap-6">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <StatTile
              reference
              label="ADIPEC advertised"
              value={
                data.advertised === undefined ? <NotAvailable /> : formatNumber(data.advertised)
              }
              hint="Reference only"
            />
            <StatTile
              label="Companies discovered"
              value={formatNumber(data.discovered)}
              hint="Found in the directory"
            />
            <StatTile
              label="Websites researched"
              value={formatNumber(data.researched)}
              hint="Completed or partly done"
            />
            <StatTile
              label="Contacts found"
              value={formatNumber(data.contactsFound)}
              hint="People saved"
            />
            <StatTile
              label="Emails checked"
              value={formatNumber(data.emailsChecked)}
              hint="Have a recorded check"
            />
            <StatTile
              label="AI drafts done"
              value={formatNumber(data.aiDone)}
              hint="Drafted or approved"
            />
          </div>

          <ChartCard title="Companies per step" subtitle="Every company is counted once per step.">
            <StepStackChart
              byStep={data.byStep}
              total={data.discovered}
              edition={data.edition}
              view="table"
            />
          </ChartCard>

          <ChartCard
            title={`Blocked records (${formatNumber(data.blocked.length)})`}
            subtitle="Steps that failed, are restricted, or wait for a person."
          >
            <DataTable
              columns={columns}
              data={blocked}
              getRowId={(row) => `${row.companyId}:${row.step}`}
              page={page}
              pageSize={PAGE_SIZE}
              total={data.blocked.length}
              onPageChange={setPage}
              empty={
                <EmptyState
                  icon={PartyPopper}
                  title="Nothing is blocked"
                  hint="Every step is either finished or still waiting its turn."
                />
              }
            />
          </ChartCard>
        </div>
      )}
    </>
  )
}
