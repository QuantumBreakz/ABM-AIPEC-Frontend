import { Building2, ChevronDown, ChevronUp, Search, SearchX } from 'lucide-react'
import { useId, useState } from 'react'
import { Link, useNavigate } from 'react-router'
import { RUN_COMPANIES_PAGE_SIZE, useRunCompanies } from '@/api/queries/runs'
import type { CompanyListItem, Run } from '@/api/types'
import { CompletenessBar } from '@/components/CompletenessBar'
import { type Columns, DataTable } from '@/components/DataTable'
import { EmptyState } from '@/components/EmptyState'
import { NotAvailable } from '@/components/NotAvailable'
import { StatusBadge } from '@/components/StatusBadge'
import { StepDots } from '@/components/StepDots'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { formatNumber } from '@/lib/format'
import { isRunning } from '@/lib/runs'

const columns: Columns<CompanyListItem> = [
  {
    id: 'name',
    header: 'Company',
    meta: { sticky: true },
    enableHiding: false,
    cell: ({ row }) => (
      <div className="flex min-w-44 flex-col items-start gap-0.5">
        <Link
          to={`/companies/${row.original.id}`}
          className="font-medium underline-offset-2 hover:underline"
        >
          {row.original.name}
        </Link>
        {row.original.duplicateOf && (
          <span className="rounded-full bg-neutral-soft px-2 py-0.5 text-xs font-medium text-neutral-ink">
            Possible duplicate
          </span>
        )}
      </div>
    ),
  },
  {
    id: 'domain',
    header: 'Website',
    cell: ({ row }) =>
      row.original.domain ? (
        <span className="block max-w-44 truncate font-mono text-[13px]" title={row.original.domain}>
          {row.original.domain}
        </span>
      ) : (
        <NotAvailable className="whitespace-nowrap" />
      ),
  },
  {
    id: 'country',
    header: 'Country',
    cell: ({ row }) => row.original.country ?? <NotAvailable className="whitespace-nowrap" />,
  },
  {
    id: 'stand',
    header: 'Stand',
    cell: ({ row }) => row.original.stand ?? <NotAvailable className="whitespace-nowrap" />,
  },
  {
    id: 'stages',
    header: 'Progress',
    cell: ({ row }) => <StepDots stages={row.original.stages} />,
  },
  {
    id: 'contacts',
    header: 'Contacts',
    cell: ({ row }) =>
      row.original.contactsCount > 0 ? (
        <span className="tabular-nums">{row.original.contactsCount}</span>
      ) : (
        <span className="text-muted-foreground">None</span>
      ),
  },
  {
    id: 'ai',
    header: 'AI draft',
    cell: ({ row }) => <StatusBadge kind="ai" status={row.original.aiStatus} />,
  },
  {
    id: 'completeness',
    header: 'Complete',
    cell: ({ row }) => <CompletenessBar value={row.original.completeness} />,
  },
]

/** Collapsible section on the run detail page showing all companies discovered or processed in the run. */
export function RunCompanies({ run }: { run: Run }) {
  const navigate = useNavigate()
  const headingId = useId()
  const panelId = useId()
  const [expanded, setExpanded] = useState(false)
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')

  const companies = useRunCompanies(run.id, page, {
    enabled: expanded,
    q: search,
    poll: expanded && isRunning(run),
  })

  const total = companies.data?.total
  const countLabel =
    total !== undefined
      ? formatNumber(total)
      : run.counts.discovered > 0
        ? formatNumber(run.counts.discovered)
        : undefined

  return (
    <section aria-labelledby={headingId} className="card-elevated p-5 sm:p-6">
      <div
        className={
          expanded
            ? 'flex flex-wrap items-center justify-between gap-3 border-b border-border/70 pb-3.5'
            : 'flex flex-wrap items-center justify-between gap-3'
        }
      >
        <div className="flex items-start gap-3">
          <span
            aria-hidden
            className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-lg bg-accent-soft text-accent-ink"
          >
            <Building2 className="size-4" />
          </span>
          <div>
            <h2 id={headingId} className="text-base font-semibold tracking-tight text-foreground">
              Companies in this run{countLabel ? ` (${countLabel})` : ''}
            </h2>
            <p className="mt-0.5 text-[0.8125rem] text-muted-foreground">
              Inspect every company discovered or processed during this run.
            </p>
          </div>
        </div>
        <Button
          type="button"
          variant={expanded ? 'secondary' : 'primary'}
          aria-expanded={expanded}
          aria-controls={panelId}
          onClick={() => setExpanded((prev) => !prev)}
        >
          {expanded ? (
            <>
              <ChevronUp className="size-4" aria-hidden />
              Hide companies
            </>
          ) : (
            <>
              <ChevronDown className="size-4" aria-hidden />
              Show companies
            </>
          )}
        </Button>
      </div>

      {expanded && (
        <div id={panelId} className="pt-4">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
            <div className="relative w-full max-w-sm">
              <Search
                aria-hidden
                className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
              />
              <Input
                type="search"
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value)
                  setPage(1)
                }}
                placeholder="Search companies in this run…"
                aria-label="Search companies in this run"
                className="pl-9"
              />
            </div>
            {companies.data && (
              <p className="text-[0.8125rem] text-muted-foreground tabular-nums">
                {formatNumber(companies.data.total)}{' '}
                {companies.data.total === 1 ? 'company' : 'companies'}
              </p>
            )}
          </div>

          <DataTable
            columns={columns}
            data={companies.data?.items}
            getRowId={(c) => c.id}
            isLoading={companies.isPending}
            isFetching={companies.isFetching}
            error={companies.error}
            onRetry={() => void companies.refetch()}
            page={page}
            pageSize={companies.data?.pageSize ?? RUN_COMPANIES_PAGE_SIZE}
            total={companies.data?.total}
            onPageChange={setPage}
            onRowClick={(c) => navigate(`/companies/${c.id}`)}
            rowLabel={(c) => `Open ${c.name}`}
            empty={
              search.trim() ? (
                <EmptyState
                  icon={SearchX}
                  title="No matching companies"
                  hint="Try a different name or domain, or clear the search box."
                  action={
                    <Button
                      variant="secondary"
                      onClick={() => {
                        setSearch('')
                        setPage(1)
                      }}
                    >
                      Clear search
                    </Button>
                  }
                />
              ) : (
                <EmptyState
                  icon={Building2}
                  title="No companies in this run yet"
                  hint="Companies will appear here once the directory step discovers exhibitors for this run."
                />
              )
            }
          />
        </div>
      )}
    </section>
  )
}
