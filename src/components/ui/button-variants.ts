import { cva } from 'class-variance-authority'

export const buttonVariants = cva(
  'inline-flex shrink-0 cursor-pointer items-center justify-center gap-2 whitespace-nowrap rounded-lg font-medium transition-all duration-150 active:scale-[0.99] disabled:pointer-events-none disabled:opacity-50',
  {
    variants: {
      variant: {
        primary:
          'bg-primary text-primary-foreground shadow-xs hover:bg-primary-hover hover:shadow-sm',
        secondary:
          'border border-border-strong bg-surface text-foreground shadow-xs hover:bg-muted/70',
        ghost: 'text-foreground hover:bg-muted',
        danger: 'bg-danger text-surface shadow-xs hover:opacity-90',
      },
      size: {
        sm: 'min-h-8 px-3 py-1 text-[0.8125rem]',
        md: 'min-h-9 px-4 py-1.5 text-sm',
        icon: 'size-8',
      },
    },
    defaultVariants: { variant: 'primary', size: 'md' },
  },
)
