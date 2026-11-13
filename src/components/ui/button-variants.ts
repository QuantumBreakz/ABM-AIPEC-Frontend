import { cva } from 'class-variance-authority'

export const buttonVariants = cva(
  'inline-flex shrink-0 cursor-pointer items-center justify-center gap-2 whitespace-nowrap rounded-xl font-medium transition-all duration-150 active:translate-y-[0.5px] disabled:pointer-events-none disabled:opacity-50',
  {
    variants: {
      variant: {
        primary:
          'bg-gradient-to-b from-[color-mix(in_srgb,var(--primary)_88%,white)] to-[var(--primary)] text-primary-foreground shadow-[inset_0_1px_0_rgba(255,255,255,0.28),0_1px_3px_rgba(0,0,0,0.2)] hover:brightness-105 active:shadow-[inset_0_2px_4px_rgba(0,0,0,0.25)]',
        secondary:
          'border border-border-strong/70 bg-gradient-to-b from-surface to-muted/50 text-foreground shadow-[inset_0_1px_0_rgba(255,255,255,0.8),0_1px_2px_rgba(0,0,0,0.06)] hover:bg-muted/80 dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.08),0_1px_2px_rgba(0,0,0,0.35)]',
        ghost: 'text-foreground hover:bg-muted/70',
        danger:
          'bg-gradient-to-b from-[color-mix(in_srgb,var(--danger)_88%,white)] to-[var(--danger)] text-[var(--ink-on-strong)] shadow-[inset_0_1px_0_rgba(255,255,255,0.25),0_1px_3px_rgba(0,0,0,0.18)] hover:brightness-105',
      },
      size: {
        sm: 'min-h-8 px-3 py-1 text-[0.8125rem]',
        md: 'min-h-9 px-4 py-1.5 text-sm',
        icon: 'size-9',
      },
    },
    defaultVariants: { variant: 'primary', size: 'md' },
  },
)
