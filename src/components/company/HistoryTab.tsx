import { ArrowRight, History } from 'lucide-react'
import { useHistory } from '@/api/queries/history'
import { DateTime } from '@/components/DateTime'
import { EmptyState } from '@/components/EmptyState'
import { ErrorState } from '@/components/ErrorState'
import { Skeleton } from '@/components/Skeleton'
import { formatHistoryValue, historyFieldLabel } from '@/lib/history'

function Value({ label, value }: { label: string; value: unknown }) {
  const text = formatHistoryValue(value)
  return (
    <div className="min-w-0">
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className={text === '(empty)' ? 'italic text-muted-foreground' : 'break-words'}>{text}</p>
    </div>
  )
}

/** Every change to this company, newest first: what changed, from what to what, by whom and when. */
export function HistoryTab({ companyId }: { companyId: string }) {
  const history = useHistory(companyId)

  if (history.isPending) {
    return (
      <div role="status" aria-busy="true" className="flex flex-col gap-3">
        <span className="sr-only">Loading history…</span>
        <Skeleton className="h-20" />
        <Skeleton className="h-20" />
      </div>
    )
  }
  if (history.error) {
    return (
      <div className="rounded-lg border border-border bg-surface">
        <ErrorState error={history.error} onRetry={() => void history.refetch()} />
      </div>
    )
  }
  if (history.data.length === 0) {
    return (
      <div className="rounded-lg border border-border bg-surface">
        <EmptyState
          icon={History}
          title="No changes yet"
          hint="When someone edits this company, the change appears here with who made it and when."
        />
      </div>
    )
  }

  return (
    <ol
      aria-label="Change history"
      className="relative flex flex-col gap-6 border-l border-border-strong pl-6"
    >
      {history.data.map((entry, index) => (
        <li key={`${entry.at}-${entry.field}-${index}`} className="relative">
          <span
            aria-hidden
            className="absolute -left-[1.9rem] top-1.5 size-2.5 rounded-full border-2 border-surface bg-primary ring-1 ring-border-strong"
          />
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <p className="font-medium">{historyFieldLabel(entry.field)}</p>
            <p className="text-[13px] text-muted-foreground">
              by {entry.by} · <DateTime value={entry.at} />
            </p>
          </div>
          <div className="mt-2 grid items-start gap-2 rounded-lg border border-border bg-surface p-3 sm:grid-cols-[1fr_auto_1fr]">
            <Value label="Before" value={entry.before} />
            <ArrowRight className="mt-5 hidden size-4 text-muted-foreground sm:block" aria-hidden />
            <Value label="After" value={entry.after} />
          </div>
        </li>
      ))}
    </ol>
  )
}
