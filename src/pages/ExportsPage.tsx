import { Download, FileDown } from 'lucide-react'
import { useId, useState } from 'react'
import { useSearchParams } from 'react-router'
import { toast } from 'sonner'
import { ApiError } from '@/api/client'
import {
  EXPORT_LOG_PAGE_SIZE,
  type ExportVersion,
  useDownloadExport,
  useExportCount,
  useExportLog,
} from '@/api/queries/exports'
import type { ExportKind, ExportLogEntry } from '@/api/types'
import { ChartCard } from '@/components/charts/ChartCard'
import { type Columns, DataTable } from '@/components/DataTable'
import { DateTime } from '@/components/DateTime'
import { EmptyState } from '@/components/EmptyState'
import { FilterBar } from '@/components/FilterBar'
import { PageHeader } from '@/components/PageHeader'
import { Button } from '@/components/ui/button'
import { describeFilters, EXPORT_KINDS, EXPORT_VERSIONS, kindLabel } from '@/lib/exports'
import { formatNumber } from '@/lib/format'
import { useFilterFields } from '@/lib/useFilterFields'
import { useUrlFilters } from '@/lib/useUrlFilters'
import { cn } from '@/lib/utils'

const isKind = (v: string | null): v is ExportKind => EXPORT_KINDS.some((k) => k.value === v)

/** A group of big radio buttons. Real radio inputs, so arrow keys and screen readers work. */
function Choice<T extends string>({
  legend,
  name,
  value,
  options,
  onChange,
}: {
  legend: string
  name: string
  value: T
  options: { value: T; label: string; description: string }[]
  onChange: (value: T) => void
}) {
  return (
    <fieldset>
      <legend className="mb-2 text-sm font-semibold">{legend}</legend>
      <div className="grid gap-3 sm:grid-cols-3">
        {options.map((option) => {
          const checked = option.value === value
          return (
            <label
              key={option.value}
              className={cn(
                'flex cursor-pointer flex-col gap-1 rounded-xl border p-3.5 transition-colors has-[:focus-visible]:ring-4 has-[:focus-visible]:ring-ring/20',
                checked
                  ? 'border-primary bg-primary/5 shadow-sm'
                  : 'border-border hover:border-border-strong',
              )}
            >
              <span className="flex items-center gap-2 text-sm font-semibold">
                <input
                  type="radio"
                  name={name}
                  value={option.value}
                  checked={checked}
                  onChange={() => onChange(option.value)}
                  className="size-4 accent-[var(--primary)]"
                />
                {option.label}
              </span>
              <span className="text-[0.8125rem] text-muted-foreground">{option.description}</span>
            </label>
          )
        })}
      </div>
    </fieldset>
  )
}

const logColumns: Columns<ExportLogEntry> = [
  {
    id: 'at',
    header: 'When',
    cell: ({ row }) => <DateTime value={row.original.at} />,
  },
  { id: 'kind', header: 'Type', cell: ({ row }) => kindLabel(row.original.kind) },
  {
    id: 'version',
    header: 'Version',
    cell: ({ row }) => (row.original.version === 'final' ? 'Final' : 'Initial'),
  },
  {
    id: 'rows',
    header: 'Rows',
    cell: ({ row }) => <span className="tabular-nums">{formatNumber(row.original.rows)}</span>,
  },
  {
    id: 'filters',
    header: 'Filters',
    cell: ({ row }) => (
      <span className="block max-w-md whitespace-normal text-muted-foreground">
        {describeFilters(row.original.filters)}
      </span>
    ),
  },
  { id: 'by', header: 'By', cell: ({ row }) => row.original.by },
]

export default function ExportsPage() {
  const countId = useId()
  const [params, setParams] = useSearchParams()
  const kind: ExportKind = isKind(params.get('kind'))
    ? (params.get('kind') as ExportKind)
    : 'outreach'
  const version: ExportVersion = params.get('version') === 'final' ? 'final' : 'initial'
  const setParam = (key: string, value: string) =>
    setParams((prev) => {
      const next = new URLSearchParams(prev)
      next.set(key, value)
      return next
    })

  const { fields, ready } = useFilterFields()
  const { filters, setFilters, clearFilters } = useUrlFilters(fields)
  const count = useExportCount(kind, ready ? filters : {})
  const download = useDownloadExport()
  const [logPage, setLogPage] = useState(1)
  const log = useExportLog(logPage)

  const rows = count.data?.rows
  const noRows = rows === 0

  const save = async () => {
    try {
      const filename = await download.mutateAsync({ kind, version, filters })
      toast.success(`${filename} was downloaded.`)
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : 'The file could not be downloaded.')
    }
  }

  return (
    <>
      <PageHeader
        title="Exports"
        description="Download CSV files for the companies you filter. Every download is recorded below."
      />

      <div className="flex flex-col gap-6">
        <ChartCard title="1. What do you want to export?">
          <div className="flex flex-col gap-6">
            <Choice
              legend="Type of file"
              name="export-kind"
              value={kind}
              options={EXPORT_KINDS}
              onChange={(v) => setParam('kind', v)}
            />
            <Choice
              legend="Version"
              name="export-version"
              value={version}
              options={EXPORT_VERSIONS}
              onChange={(v) => setParam('version', v)}
            />
          </div>
        </ChartCard>

        <ChartCard
          title="2. Which companies?"
          subtitle="The same filters as the company list. Leave them empty to include everything."
        >
          <FilterBar
            fields={fields}
            values={filters}
            onChange={setFilters}
            onClear={clearFilters}
          />
        </ChartCard>

        <ChartCard title="3. Download">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p id={countId} role="status" className="text-sm">
                {rows === undefined ? (
                  <span className="text-muted-foreground">Counting rows…</span>
                ) : noRows ? (
                  <span className="font-medium text-warning-ink">
                    No rows match these filters. Change the filters to download a file.
                  </span>
                ) : (
                  <>
                    <strong className="tabular-nums">{formatNumber(rows)}</strong>{' '}
                    {rows === 1 ? 'row' : 'rows'} in this {kindLabel(kind).toLowerCase()} file
                  </>
                )}
              </p>
              <p className="mt-1 text-[0.8125rem] text-muted-foreground">
                The file opens in Excel with correct characters.
              </p>
            </div>
            <Button
              onClick={() => void save()}
              loading={download.isPending}
              disabled={rows === undefined || noRows}
              aria-describedby={countId}
            >
              <Download className="size-4" aria-hidden />
              Download CSV
            </Button>
          </div>
        </ChartCard>

        <ChartCard title="Export history" subtitle="Who downloaded what, newest first.">
          <DataTable
            columns={logColumns}
            data={log.data?.items}
            getRowId={(row) => row.id}
            isLoading={log.isPending}
            isFetching={log.isFetching}
            error={log.error}
            onRetry={() => void log.refetch()}
            page={logPage}
            pageSize={log.data?.pageSize ?? EXPORT_LOG_PAGE_SIZE}
            total={log.data?.total}
            onPageChange={setLogPage}
            empty={
              <EmptyState
                icon={FileDown}
                title="Nothing exported yet"
                hint="Files you download appear here."
              />
            }
          />
        </ChartCard>
      </div>
    </>
  )
}
