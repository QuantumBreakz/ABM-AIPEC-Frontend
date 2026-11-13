import { cn } from '@/lib/utils'

/** Bespoke geometric mark: energy horizon + signal nodes for ADIPEC Lead Gen. */
export function BrandMark({ className }: { className?: string }) {
  return (
    <span
      aria-hidden
      className={cn(
        'relative flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-sm ring-1 ring-inset ring-black/10 dark:ring-white/15',
        className,
      )}
    >
      <svg viewBox="0 0 24 24" fill="none" className="size-4.5" aria-hidden="true">
        <path
          d="M12 3L20 7.5V16.5L12 21L4 16.5V7.5L12 3Z"
          stroke="currentColor"
          strokeWidth="1.75"
          strokeLinejoin="round"
        />
        <path
          d="M12 8.5L16 15.5H8L12 8.5Z"
          fill="currentColor"
          fillOpacity="0.22"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinejoin="round"
        />
        <circle cx="12" cy="13.25" r="1.25" fill="currentColor" />
      </svg>
    </span>
  )
}
