import {
  BarChart3,
  Building2,
  CircleAlert,
  Copy,
  FileText,
  Layers,
  ListChecks,
  type LucideIcon,
  Table2,
  UserRound,
  Users,
} from 'lucide-react'
import { useMemo } from 'react'
import { Link, useSearchParams } from 'react-router'
import { useEvents } from '@/api/queries/events'
import { useOverview } from '@/api/queries/overview'
import type { Overview } from '@/api/types'
import { ChartCard } from '@/components/charts/ChartCard'
import { EmailSplitBar } from '@/components/charts/EmailSplitBar'
import { StatTile } from '@/components/charts/StatTile'
import { StepStackChart } from '@/components/charts/StepStackChart'
import { EmptyState } from '@/components/EmptyState'
import { ErrorState } from '@/components/ErrorState'
import { NotAvailable } from '@/components/NotAvailable'
import { PageHeader } from '@/components/PageHeader'
import { Skeleton } from '@/components/Skeleton'
import { Button } from '@/components/ui/button'
import { Select } from '@/components/ui/input'
import { formatNumber } from '@/lib/format'
import { plural } from '@/lib/overview'
import type { Tone } from '@/lib/status'
import { cn } from '@/lib/utils'

type View = 'chart' | 'table'

function ViewToggle({ view, onChange }: { view: View; onChange: (view: View) => void }) {
  const option = (value: View, label: string, Icon: LucideIcon) => (
    <button
      type="button"
      aria-pressed={view === value}
      onClick={() => onChange(value)}
      className={cn(
        'inline-flex min-h-8 cursor-pointer items-center gap-1.5 rounded-lg px-3 py-1 text-[0.8125rem] font-medium transition-all',
        view === value
          ? 'skeuo-thumb text-foreground'
          : 'text-muted-foreground hover:text-foreground',
      )}
    >
      <Icon className="size-3.5" aria-hidden />
      {label}
    </button>
  )
  return (
    <div
      role="group"
      aria-label="Show data as"
      className="skeuo-track inline-flex gap-1 rounded-xl p-1"
    >
      {option('chart', 'Chart', BarChart3)}
      {option('table', 'Table', Table2)}
    </div>
  )
}

function Tiles({ data }: { data: Overview }) {
  const base = `/companies?edition=${data.edition}`
  const tile = (
    label: string,
    value: number,
    hint: string,
    to: string,
    icon: LucideIcon,
    iconTone?: Tone,
  ) => (
    <StatTile
      label={label}
      value={formatNumber(value)}
      hint={hint}
      to={to}
      icon={icon}
      iconTone={iconTone}
    />
  )

  const uniquePct = data.discovered ? Math.round((data.unique / data.discovered) * 100) : 0
  const contactPct = data.discovered
    ? Math.round((data.companiesWithContacts / data.discovered) * 100)
    : 0

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <StatTile
        hero
        className="sm:col-span-2"
        label="Companies discovered"
        value={formatNumber(data.discovered)}
        hint="Directory"
        to={base}
        icon={Building2}
        iconTone="info"
      />
      {/* The advertised figure is a reference from ADIPEC. It is never compared with what we found. */}
      <StatTile
        reference
        className="sm:col-span-2"
        label="ADIPEC advertised"
        value={data.advertised === undefined ? <NotAvailable /> : formatNumber(data.advertised)}
        hint="Reference only"
      />
      {tile(
        'Unique companies',
        data.unique,
        `${uniquePct}% deduplicated`,
        `${base}&duplicate=false`,
        Layers,
      )}
      {tile(
        'Possible duplicates',
        data.duplicates,
        data.duplicates === 0 ? 'None' : 'Merge queue',
        `${base}&duplicate=true`,
        Copy,
      )}
      {tile('Contacts', data.contacts, 'Saved people', `${base}&hasContacts=true`, Users)}
      {tile(
        'Companies with contacts',
        data.companiesWithContacts,
        `${contactPct}% coverage`,
        `${base}&hasContacts=true`,
        UserRound,
      )}
      <StatTile
        className="lg:col-span-2"
        label="AI drafts to review"
        value={formatNumber(data.ai.draft)}
        hint={`${formatNumber(data.ai.approved)} approved`}
        to={`${base}&aiStatus=draft`}
        icon={FileText}
        iconTone="info"
      />
      <StatTile
        className="lg:col-span-2"
        label="Companies with a failure"
        value={formatNumber(data.failures)}
        hint={data.failures === 0 ? 'All clear' : 'Needs attention'}
        to={`${base}&stepStatus=failed`}
        icon={data.failures === 0 ? ListChecks : CircleAlert}
        iconTone={data.failures === 0 ? 'success' : 'danger'}
      />
    </div>
  )
}

function LoadingTiles() {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4" aria-busy="true">
      <span className="sr-only" role="status">
        Loading overview…
      </span>
      {Array.from({ length: 8 }, (_, i) => (
        <Skeleton key={i} className={cn('h-32 rounded-xl', i < 2 && 'sm:col-span-2')} />
      ))}
    </div>
  )
}

export default function OverviewPage() {
  const [params, setParams] = useSearchParams()
  const events = useEvents()

  // Use the edition in the URL if we know it; otherwise the newest one.
  const edition = useMemo(() => {
    const list = events.data
    if (!list || list.length === 0) return undefined
    const wanted = Number(params.get('edition'))
    if (list.some((e) => e.edition === wanted)) return wanted
    return Math.max(...list.map((e) => e.edition))
  }, [events.data, params])

  const overview = useOverview(edition)
  const view: View = params.get('view') === 'table' ? 'table' : 'chart'
  const eventName = events.data?.find((e) => e.edition === edition)?.name

  const setParam = (key: string, value: string | undefined) =>
    setParams((prev) => {
      const next = new URLSearchParams(prev)
      if (value) next.set(key, value)
      else next.delete(key)
      return next
    })

  const data = overview.data

  const emailTotal = data ? Object.values(data.emailsByStatus).reduce((a, b) => a + b, 0) : 0

  return (
    <>
      <PageHeader
        title="Overview"
        description={eventName ? `${eventName} pipeline` : 'Pipeline overview'}
        actions={
          events.data && (
            <div className="flex items-center gap-2.5">
              <label
                htmlFor="edition"
                className="text-[0.8125rem] font-medium text-muted-foreground"
              >
                Edition
              </label>
              <Select
                id="edition"
                className="w-44"
                value={edition ?? ''}
                onChange={(e) => setParam('edition', e.target.value)}
              >
                {events.data.map((event) => (
                  <option key={event.id} value={event.edition}>
                    {event.name}
                  </option>
                ))}
              </Select>
            </div>
          )
        }
      />

      {(events.error || overview.error) && (
        <div className="card-elevated">
          <ErrorState
            error={events.error ?? overview.error}
            onRetry={() => {
              void events.refetch()
              void overview.refetch()
            }}
          />
        </div>
      )}

      {!events.error && !overview.error && (!data || events.isPending) && <LoadingTiles />}

      {data && !overview.error && data.discovered === 0 && (
        <div className="card-elevated">
          <EmptyState
            icon={Building2}
            title="No companies discovered for this edition yet"
            hint="Start a run to discover exhibitors."
            action={
              <Button asChild variant="secondary">
                <Link to="/runs">Go to runs</Link>
              </Button>
            }
          />
        </div>
      )}

      {data && !overview.error && data.discovered > 0 && (
        <div className="flex flex-col gap-6">
          <Tiles data={data} />

          <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border/80 bg-surface/70 px-4 py-2.5">
            <div className="flex flex-wrap items-center gap-2 text-[0.8125rem] text-muted-foreground">
              <span className="font-semibold text-foreground">{formatNumber(data.unique)}</span>{' '}
              unique {plural(data.unique, 'company', 'companies')}
              <span className="text-border-strong" aria-hidden>
                ·
              </span>
              <span>Click any segment to filter</span>
            </div>
            <ViewToggle
              view={view}
              onChange={(v) => setParam('view', v === 'table' ? 'table' : undefined)}
            />
          </div>

          <div className="grid gap-6 lg:grid-cols-3">
            <ChartCard
              className="lg:col-span-2"
              title="Progress by step"
              action={
                <span className="rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium tabular-nums text-muted-foreground">
                  {formatNumber(data.discovered)} total
                </span>
              }
            >
              <StepStackChart
                byStep={data.byStep}
                total={data.discovered}
                edition={data.edition}
                view={view}
              />
            </ChartCard>
            <ChartCard
              title="Emails by status"
              action={
                <span className="rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium tabular-nums text-muted-foreground">
                  {formatNumber(emailTotal)} total
                </span>
              }
            >
              <EmailSplitBar counts={data.emailsByStatus} edition={data.edition} view={view} />
            </ChartCard>
          </div>
        </div>
      )}
    </>
  )
}
