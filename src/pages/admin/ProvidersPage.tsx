import { Info } from 'lucide-react'
import { useProviders } from '@/api/queries/providers'
import { ChartCard } from '@/components/charts/ChartCard'
import { ErrorState } from '@/components/ErrorState'
import { PageHeader } from '@/components/PageHeader'
import { Skeleton } from '@/components/Skeleton'
import { PROVIDERS } from '@/lib/providers'
import { TONE_BADGE } from '@/lib/status'
import { cn } from '@/lib/utils'

/** Which outside tools are switched on, and what the team does by hand while one is off. Read only. */
export default function ProvidersPage() {
  const providers = useProviders()

  return (
    <>
      <PageHeader
        title="Providers"
        description="The outside tools this workspace can use. Each one can be off; nothing breaks, the work is done by hand."
      />

      {providers.isPending ? (
        <div role="status" aria-busy="true" className="flex flex-col gap-3">
          <span className="sr-only">Loading…</span>
          <Skeleton className="h-28" />
          <Skeleton className="h-28" />
        </div>
      ) : providers.error ? (
        <div className="card-elevated">
          <ErrorState error={providers.error} onRetry={() => void providers.refetch()} />
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          <ul aria-label="Providers" className="flex flex-col gap-4">
            {PROVIDERS.map((info) => {
              const on = providers.data[info.key]
              return (
                <li key={info.key}>
                  <section aria-label={info.name} className="card-elevated flex flex-col gap-2 p-5">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <h2 className="text-base font-semibold tracking-tight">{info.name}</h2>
                      <span
                        className={cn(
                          'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium',
                          on ? TONE_BADGE.success : TONE_BADGE.muted,
                        )}
                      >
                        {on ? 'On' : 'Off'}
                      </span>
                    </div>
                    <p className="text-sm">{info.does}</p>
                    {info.key === 'llm' && on && providers.data.llmModel && (
                      <p className="text-[0.8125rem] text-muted-foreground">
                        Model: {providers.data.llmModel}
                      </p>
                    )}
                    {!on && (
                      <p className="rounded-lg bg-muted/60 px-3 py-2 text-[0.8125rem]">
                        <span className="font-medium">While it is off: </span>
                        {info.whenOff}
                      </p>
                    )}
                  </section>
                </li>
              )
            })}
          </ul>

          <ChartCard title="Sales Navigator">
            <p className="text-sm">
              Always manual. People search in Sales Navigator themselves and type in what they find.
              The app only links out and never signs in or collects anything from LinkedIn.
            </p>
          </ChartCard>

          <p className="flex items-start gap-2 text-[0.8125rem] text-muted-foreground">
            <Info className="mt-0.5 size-4 shrink-0" aria-hidden />
            Switches and keys are set on the server, never in the browser. Ask the developer to
            change them.
          </p>
        </div>
      )}
    </>
  )
}
