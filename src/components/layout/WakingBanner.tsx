import { Loader2 } from 'lucide-react'
import { useWaking } from '@/api/waking'

/** Shown on every page while the free-tier backend is waking up (it can take about a minute). */
export function WakingBanner() {
  const waking = useWaking()
  if (!waking) return null
  return (
    <div
      role="status"
      className="sticky top-0 z-[60] flex items-center justify-center gap-2 bg-warning-soft px-4 py-2 text-sm font-medium text-warning-ink"
    >
      <Loader2 className="size-4 animate-spin" aria-hidden />
      Server is waking up… this can take up to a minute. Your request will continue automatically.
    </div>
  )
}
