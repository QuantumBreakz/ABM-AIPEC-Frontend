import { cn } from '@/lib/utils'

/** Apple-inspired squircle emblem with glossy inner rim and geometric pipeline mark. */
export function BrandMark({ className }: { className?: string }) {
  return (
    <span
      aria-hidden
      className={cn(
        'relative flex size-8 shrink-0 items-center justify-center rounded-[24%] bg-gradient-to-b from-[color-mix(in_srgb,var(--primary)_85%,white)] to-[var(--primary)] text-primary-foreground shadow-[inset_0_1px_0_rgba(255,255,255,0.35),0_2px_6px_rgba(0,0,0,0.18)] ring-1 ring-inset ring-black/10 dark:ring-white/15',
        className,
      )}
    >
      <svg viewBox="0 0 24 24" fill="none" className="size-4.5" aria-hidden>
        <path
          d="M12 3L20 7.5V16.5L12 21L4 16.5V7.5L12 3Z"
          stroke="currentColor"
          strokeWidth="1.75"
          strokeLinejoin="round"
        />
        <path
          d="M12 8.5L16 15.5H8L12 8.5Z"
          fill="currentColor"
          fillOpacity="0.25"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinejoin="round"
        />
        <circle cx="12" cy="13.25" r="1.25" fill="currentColor" />
      </svg>
    </span>
  )
}
