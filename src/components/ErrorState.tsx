import { TriangleAlert } from 'lucide-react'
import { ApiError } from '@/api/client'
import { Button } from './ui/button'

function messageFor(error: unknown) {
  if (error instanceof ApiError) {
    if (error.status === 403) return 'You do not have access to this.'
    if (error.status === 404) return 'We could not find what you were looking for.'
    return error.message
  }
  return 'Something went wrong while loading this.'
}

/** Friendly error with a retry button. Pass the thrown error to show a specific message. */
export function ErrorState({ error, onRetry }: { error?: unknown; onRetry?: () => void }) {
  return (
    <div
      role="alert"
      className="flex flex-col items-center justify-center gap-3 px-6 py-14 text-center"
    >
      <div className="flex size-11 items-center justify-center rounded-full bg-danger-soft text-danger-ink">
        <TriangleAlert className="size-5" aria-hidden />
      </div>
      <div>
        <p className="font-medium">Could not load this</p>
        <p className="mt-1 max-w-sm text-muted-foreground">{messageFor(error)}</p>
      </div>
      {onRetry && (
        <Button variant="secondary" onClick={onRetry}>
          Try again
        </Button>
      )}
    </div>
  )
}
