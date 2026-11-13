import { ChevronDown } from 'lucide-react'
import type { InputHTMLAttributes, SelectHTMLAttributes } from 'react'
import { cn } from '@/lib/utils'

const field =
  'h-9 w-full rounded-md border border-border bg-surface px-3 text-sm text-foreground placeholder:text-muted-foreground transition-colors hover:border-muted-foreground/40 disabled:opacity-50'

export function Input({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={cn(field, className)} {...props} />
}

export function Select({ className, children, ...props }: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <div className="relative">
      <select className={cn(field, 'appearance-none pr-9', className)} {...props}>
        {children}
      </select>
      <ChevronDown
        className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
        aria-hidden
      />
    </div>
  )
}
