import type { ReactNode } from 'react'
import { NotAvailable } from './NotAvailable'

export type DescriptionItem = {
  label: string
  /** Leave undefined (or empty) for a missing value: it shows "Not available" and the reason. */
  value: ReactNode | undefined
}

/**
 * Label and value pairs, one per row. A missing value is never a blank: it reads
 * "Not available" plus the reason it is missing (AT-02).
 */
export function DescriptionList({
  items,
  missingReason,
}: {
  items: DescriptionItem[]
  missingReason?: string
}) {
  return (
    <dl className="grid gap-x-6 gap-y-3 sm:grid-cols-[9rem_minmax(0,1fr)]">
      {items.map(({ label, value }) => {
        const missing = value === undefined || value === null || value === ''
        return (
          <div key={label} className="contents">
            <dt className="text-[13px] font-medium text-muted-foreground">{label}</dt>
            <dd className="min-w-0 break-words">
              {missing ? <NotAvailable reason={missingReason} /> : value}
            </dd>
          </div>
        )
      })}
    </dl>
  )
}
