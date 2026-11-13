import { cn } from '@/lib/utils'

/** A row of small tags (services, markets). Plain text, so it reads fine without colour. */
export function TagList({
  items,
  label,
  className,
}: {
  items: string[]
  label: string
  className?: string
}) {
  return (
    <ul aria-label={label} className={cn('flex flex-wrap gap-1.5', className)}>
      {items.map((item) => (
        <li
          key={item}
          className="rounded-md border border-border bg-muted px-2 py-0.5 text-[13px] text-foreground"
        >
          {item}
        </li>
      ))}
    </ul>
  )
}
