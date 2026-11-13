import type { HTMLAttributes } from 'react'
import { cn } from '@/lib/utils'

/** Grey placeholder block shown while data loads (better than a spinner: no layout jump). */
export function Skeleton({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div aria-hidden className={cn('animate-pulse rounded-md bg-muted', className)} {...props} />
  )
}
