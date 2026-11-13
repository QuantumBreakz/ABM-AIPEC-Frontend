import { Building2, SearchX } from 'lucide-react'
import { useMemo } from 'react'
import { Link, useNavigate } from 'react-router'
import { COMPANY_PAGE_SIZE, useCompanies } from '@/api/queries/companies'
import { useEvents } from '@/api/queries/events'
import type { CompanyListItem } from '@/api/types'
import { CompletenessBar } from '@/components/CompletenessBar'
import { type Columns, DataTable } from '@/components/DataTable'
import { DateTime } from '@/components/DateTime'
import { EmailSummary } from '@/components/EmailSummary'
import { EmptyState } from '@/components/EmptyState'
import { FilterBar } from '@/components/FilterBar'
import { NotAvailable } from '@/components/NotAvailable'
import { PageHeader } from '@/components/PageHeader'
import { StatusBadge } from '@/components/StatusBadge'
import { StepDots } from '@/components/StepDots'
import { Button } from '@/components/ui/button'
import {
  COMPANY_FILTER_FIELDS,
  countActiveFilters,
  type FilterField,
  type FilterValues,
} from '@/lib/filters'
import { formatNumber } from '@/lib/format'
import { useUrlFilters } from '@/lib/useUrlFilters'
import { cn } from '@/lib/utils'

const QUICK_VIEWS: { label: string; patch: FilterValues }[] = [
  { label: 'All', patch: {} },
  { label: 'Has contacts', patch: { hasContacts: true } },
  { label: 'Needs review', patch: { stepStatus: 'needs_review' } },
  { label: 'Failed', patch: { stepStatus: 'failed' } },
  { label: 'Duplicates', patch: { duplicate: true } },
  { label: 'AI drafts', patch: { aiStatus: 'draft' } },
]

function isQuickActive(values: FilterValues, patch: FilterValues) {
  const entries = Object.entries(patch)
  if (entries.length === 0) {
    return (
      values.hasContacts === undefined &&
      values.stepStatus === undefined &&
      values.duplicate === undefined &&
      values.aiStatus === undefined
    )
  }
  return entries.every(([k, v]) => values[k] === v)
}

const columns: Columns<CompanyListItem> = [
  {
    id: 'name',
    accessorKey: 'name', // sortable columns need an accessor
    meta: { sticky: true },
    header: 'Company',
    enableSorting: true,
    enableHiding: false,
    cell: ({ row }) => (
      <div className="flex min-w-48 flex-col items-start gap-0.5">
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
    id: 'category',
    header: 'Category',
    cell: ({ row }) =>
      row.original.category ? (
        <span className="block max-w-40 truncate" title={row.original.category}>
          {row.original.category}
        </span>
      ) : (
        <NotAvailable className="whitespace-nowrap" />
      ),
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
    id: 'emails',
    header: 'Emails',
    cell: ({ row }) => <EmailSummary counts={row.original.emailsByStatus} />,
  },
  {
    id: 'ai',
    header: 'AI draft',
    cell: ({ row }) => <StatusBadge kind="ai" status={row.original.aiStatus} />,
  },
  {
    id: 'completeness',
    accessorKey: 'completeness',
    header: 'Complete',
    enableSorting: true,
    cell: ({ row }) => <CompletenessBar value={row.original.completeness} />,
  },
  {
    id: 'updatedAt',
    accessorKey: 'updatedAt',
    header: 'Updated',
    enableSorting: true,
    cell: ({ row }) => <DateTime value={row.original.updatedAt} />,
  },
]

/** Same filters as always, but "Edition" becomes a dropdown of the editions we know about. */
function useFilterFields(): { fields: FilterField[]; ready: boolean } {
  const events = useEvents()
  const fields = useMemo<FilterField[]>(() => {
    const list = events.data
    if (!list) return COMPANY_FILTER_FIELDS
    return COMPANY_FILTER_FIELDS.map((field) =>
      field.key === 'edition'
        ? {
            key: 'edition',
            label: 'Edition',
            type: 'select',
            options: list.map((e) => ({ value: String(e.edition), label: e.name })),
          }
        : field,
    )
  }, [events.data])
  return { fields, ready: !events.isPending }
}

export default function CompaniesPage() {
  const navigate = useNavigate()
  const { fields, ready } = useFilterFields()
  const { filters, setFilters, clearFilters, page, setPage, sort, setSort } = useUrlFilters(fields)
  const companies = useCompanies(filters, page, sort, ready)

  const active = countActiveFilters(filters)
  const data = companies.data
  const pastTheEnd = !!data && data.items.length === 0 && data.total > 0

  const empty = pastTheEnd ? (
    <EmptyState
      icon={SearchX}
      title="That page does not exist"
      hint="Go back to page 1."
      action={<Button onClick={() => setPage(1)}>Go to the first page</Button>}
    />
  ) : active > 0 ? (
    <EmptyState
      icon={SearchX}
      title="No companies match these filters"
      hint="Adjust or clear your filters."
      action={
        <Button variant="secondary" onClick={clearFilters}>
          Clear filters
        </Button>
      }
    />
  ) : (
    <EmptyState
      icon={Building2}
      title="No companies yet"
      hint="Run pipeline discovery to populate exhibitors."
      action={
        <Button asChild variant="secondary">
          <Link to="/runs">Go to runs</Link>
        </Button>
      }
    />
  )

  const applyQuick = (patch: FilterValues) => {
    const next: FilterValues = { ...filters }
    delete next.hasContacts
    delete next.stepStatus
    delete next.duplicate
    delete next.aiStatus
    setFilters({ ...next, ...patch })
  }

  return (
    <>
      <PageHeader
        title="Companies"
        description={
          data
            ? `${formatNumber(data.total)} ${active > 0 ? 'matching ' : ''}${data.total === 1 ? 'company' : 'companies'}`
            : 'Exhibitor directory'
        }
      />
      <div className="flex flex-col gap-4">
        <div role="group" aria-label="Quick views" className="flex flex-wrap items-center gap-1.5">
          {QUICK_VIEWS.map((view) => {
            const on = isQuickActive(filters, view.patch)
            return (
              <button
                key={view.label}
                type="button"
                aria-pressed={on}
                onClick={() => applyQuick(view.patch)}
                className={cn(
                  'min-h-8 cursor-pointer rounded-full border px-3 py-1 text-xs font-medium transition-colors',
                  on
                    ? 'border-primary/40 bg-primary/10 text-primary-hover font-semibold'
                    : 'border-border bg-surface text-muted-foreground hover:bg-muted/60 hover:text-foreground',
                )}
              >
                {view.label}
              </button>
            )
          })}
        </div>
        <FilterBar fields={fields} values={filters} onChange={setFilters} onClear={clearFilters} />
        <DataTable
          columns={columns}
          data={data?.items}
          getRowId={(c) => c.id}
          isLoading={!ready || companies.isPending}
          isFetching={companies.isFetching}
          error={companies.error}
          onRetry={() => void companies.refetch()}
          sort={sort}
          onSortChange={setSort}
          page={page}
          pageSize={COMPANY_PAGE_SIZE}
          total={data?.total}
          onPageChange={setPage}
          onRowClick={(c) => navigate(`/companies/${c.id}`)}
          rowLabel={(c) => `Open ${c.name}`}
          empty={empty}
          storageKey="companies"
          defaultVisibility={{ stand: false, category: false, domain: false }}
        />
      </div>
    </>
  )
}
