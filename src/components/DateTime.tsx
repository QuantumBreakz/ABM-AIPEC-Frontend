import { formatExact, formatRelative } from '@/lib/format'
import { NotAvailable } from './NotAvailable'
import { Tooltip } from './ui/tooltip'

/** "3 hours ago"; hover or focus for the exact date and time. */
export function DateTime({ value }: { value: string | undefined }) {
  const relative = formatRelative(value)
  const exact = formatExact(value)
  if (!relative || !exact) return <NotAvailable />
  return (
    <Tooltip content={exact}>
      <time dateTime={value} tabIndex={0} className="whitespace-nowrap">
        {relative}
      </time>
    </Tooltip>
  )
}
