import { ChevronDown } from 'lucide-react'
import type { InputHTMLAttributes, SelectHTMLAttributes, TextareaHTMLAttributes } from 'react'
import { cn } from '@/lib/utils'

const field =
  'min-h-9 w-full rounded-lg border border-border-strong bg-surface px-3 py-1.5 text-sm text-foreground shadow-[inset_0_1px_2px_rgb(14_23_38/0.03)] placeholder:text-muted-foreground transition-colors hover:border-foreground/50 focus-visible:border-primary disabled:opacity-50'

export function Input({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={cn(field, className)} {...props} />
}

export function Select({ className, children, ...props }: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <div className="relative">
      <select className={cn(field, 'cursor-pointer appearance-none pr-9', className)} {...props}>
        {children}
      </select>
      <ChevronDown
        className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
        aria-hidden
      />
    </div>
  )
}

export function Textarea({ className, ...props }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea className={cn(field, 'h-auto min-h-24 py-2 leading-relaxed', className)} {...props} />
  )
}
