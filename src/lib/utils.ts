import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

/** Join class names and resolve Tailwind conflicts: cn('p-2', cond && 'p-4') */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
