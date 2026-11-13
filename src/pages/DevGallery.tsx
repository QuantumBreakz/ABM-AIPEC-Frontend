import { Plus, SearchX } from 'lucide-react'
import { useState } from 'react'
import {
  AI_STATUSES,
  EMAIL_STATUSES,
  STEP_KEYS,
  STEP_STATUSES,
  type StepState,
  type StepStatus,
} from '@/api/types'
import { ConfirmDialog } from '@/components/ConfirmDialog'
import { DataTable, type Columns } from '@/components/DataTable'
import { DateTime } from '@/components/DateTime'
import { Drawer } from '@/components/Drawer'
import { EmptyState } from '@/components/EmptyState'
import { ErrorState } from '@/components/ErrorState'
import { FilterBar } from '@/components/FilterBar'
import { NotAvailable } from '@/components/NotAvailable'
import { PageHeader } from '@/components/PageHeader'
import { Skeleton } from '@/components/Skeleton'
import { SourceLink } from '@/components/SourceLink'
import { StatusBadge } from '@/components/StatusBadge'
import { StepDots } from '@/components/StepDots'
import { Button } from '@/components/ui/button'
import { COMPANY_FILTER_FIELDS } from '@/lib/filters'
import { useUrlFilters } from '@/lib/useUrlFilters'

const THREE_HOURS_AGO = new Date(Date.now() - 3 * 3600_000).toISOString()

type Row = { id: string; name: string; country: string; stages: Record<string, StepState> }

const ROWS: Row[] = Array.from({ length: 6 }, (_, i) => ({
  id: String(i + 1),
  name: [
    'Example Energy',
    'Sample Drilling',
    'Demo Petro',
    'Test Marine',
    'Acme Gas',
    'Foo Oilfield',
  ][i] as string,
  country: ['AE', 'SA', 'QA', 'KW', 'OM', 'BH'][i] as string,
  stages: Object.fromEntries(
    STEP_KEYS.map((k, j) => [
      k,
      {
        status: STEP_STATUSES[(i + j) % STEP_STATUSES.length] as StepStatus,
        reason: 'Sample reason',
      },
    ]),
  ),
}))

const columns: Columns<Row> = [
  { id: 'name', accessorKey: 'name', header: 'Name', enableSorting: true },
  { id: 'country', accessorKey: 'country', header: 'Country' },
  {
    id: 'stages',
    header: 'Progress',
    cell: ({ row }) => <StepDots stages={row.original.stages} />,
  },
  { id: 'updated', header: 'Updated', cell: () => <DateTime value={new Date().toISOString()} /> },
]

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mb-10">
      <h2 className="mb-3 text-base font-semibold">{title}</h2>
      {children}
    </section>
  )
}

/** Development-only page that shows every shared component. Removed from production later. */
export default function DevGallery() {
  const { filters, setFilters, clearFilters, page, setPage, sort, setSort } =
    useUrlFilters(COMPANY_FILTER_FIELDS)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [dark, setDark] = useState(false)

  return (
    <div className="mx-auto max-w-5xl p-8">
      <PageHeader
        title="Component gallery"
        description="Every shared component in one place. Development only."
        actions={
          <Button
            variant="secondary"
            onClick={() => {
              document.documentElement.classList.toggle('dark', !dark)
              setDark(!dark)
            }}
          >
            {dark ? 'Light theme' : 'Dark theme'}
          </Button>
        }
      />

      <Section title="Buttons">
        <div className="flex flex-wrap gap-2">
          <Button>
            <Plus className="size-4" aria-hidden />
            Primary
          </Button>
          <Button variant="secondary">Secondary</Button>
          <Button variant="ghost">Ghost</Button>
          <Button variant="danger">Danger</Button>
          <Button loading>Saving</Button>
          <Button disabled>Disabled</Button>
        </div>
      </Section>

      <Section title="Step status">
        <div className="flex flex-wrap gap-2">
          {STEP_STATUSES.map((s) => (
            <StatusBadge key={s} kind="step" status={s} />
          ))}
        </div>
      </Section>
      <Section title="Email status">
        <div className="flex flex-wrap gap-2">
          {EMAIL_STATUSES.map((s) => (
            <StatusBadge key={s} kind="email" status={s} />
          ))}
        </div>
      </Section>
      <Section title="AI status">
        <div className="flex flex-wrap gap-2">
          {AI_STATUSES.map((s) => (
            <StatusBadge key={s} kind="ai" status={s} />
          ))}
        </div>
      </Section>

      <Section title="Sources, dates and missing data">
        <div className="flex flex-wrap items-center gap-6">
          <SourceLink href="https://www.example.com/about" />
          <SourceLink href="javascript:alert(1)" />
          <DateTime value={THREE_HOURS_AGO} />
          <NotAvailable reason="Website was offline" />
        </div>
      </Section>

      <Section title="Filters (stored in the URL), table and pagination">
        <div className="flex flex-col gap-4">
          <FilterBar
            fields={COMPANY_FILTER_FIELDS}
            values={filters}
            onChange={setFilters}
            onClear={clearFilters}
          />
          <DataTable
            columns={columns}
            data={ROWS}
            getRowId={(r) => r.id}
            sort={sort}
            onSortChange={setSort}
            page={page}
            pageSize={6}
            total={120}
            onPageChange={setPage}
            onRowClick={(r) => alert(`Open ${r.name}`)}
            rowLabel={(r) => `Open ${r.name}`}
            storageKey="gallery"
          />
        </div>
      </Section>

      <Section title="Table states">
        <div className="grid gap-4 md:grid-cols-3">
          <DataTable
            columns={columns.slice(0, 2)}
            data={undefined}
            isLoading
            getRowId={(r) => r.id}
            page={1}
            pageSize={50}
            total={undefined}
            onPageChange={() => {}}
          />
          <DataTable
            columns={columns.slice(0, 2)}
            data={[]}
            getRowId={(r) => r.id}
            page={1}
            pageSize={50}
            total={0}
            onPageChange={() => {}}
            empty={
              <EmptyState
                icon={SearchX}
                title="No companies match"
                hint="Try removing a filter."
                action={<Button variant="secondary">Clear filters</Button>}
              />
            }
          />
          <DataTable
            columns={columns.slice(0, 2)}
            data={undefined}
            error={new Error('boom')}
            onRetry={() => {}}
            getRowId={(r) => r.id}
            page={1}
            pageSize={50}
            total={undefined}
            onPageChange={() => {}}
          />
        </div>
      </Section>

      <Section title="Skeleton, error, dialogs">
        <div className="mb-4 flex gap-3">
          <Skeleton className="h-8 w-40" />
          <Skeleton className="h-8 w-24" />
        </div>
        <div className="mb-4 rounded-lg border border-border bg-surface">
          <ErrorState onRetry={() => {}} />
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={() => setConfirmOpen(true)}>
            Open confirm dialog
          </Button>
          <Button variant="secondary" onClick={() => setDrawerOpen(true)}>
            Open drawer
          </Button>
        </div>
      </Section>

      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title="Delete this contact?"
        description="This also removes their emails and drafts. This cannot be undone."
        confirmLabel="Delete"
        destructive
        onConfirm={() => setConfirmOpen(false)}
      />
      <Drawer
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
        title="Example Energy"
        description="Review task"
        footer={<Button onClick={() => setDrawerOpen(false)}>Mark done</Button>}
      >
        <p>Drawer content goes here.</p>
      </Drawer>
    </div>
  )
}
