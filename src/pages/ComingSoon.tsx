import { Hammer } from 'lucide-react'
import { EmptyState } from '@/components/EmptyState'
import { PageHeader } from '@/components/PageHeader'

/** Placeholder for a screen that a later ticket builds. */
export function ComingSoon({
  title,
  description,
  ticket,
}: {
  title: string
  description?: string
  ticket: string
}) {
  return (
    <>
      <PageHeader title={title} description={description} />
      <div className="rounded-lg border border-dashed border-border bg-surface">
        <EmptyState
          icon={Hammer}
          title="This screen is being built"
          hint={`It arrives with ticket ${ticket}.`}
        />
      </div>
    </>
  )
}
