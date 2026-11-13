import { ExternalLink } from 'lucide-react'
import { safeHttpUrl } from '@/lib/format'
import { cn } from '@/lib/utils'

/**
 * Link to a source. Opens in a new tab, shows the domain, and refuses anything that is not
 * a plain http(s) URL (so a bad value like "javascript:..." can never become a link).
 */
export function SourceLink({
  href,
  label,
  className,
}: {
  href: string | undefined
  label?: string
  className?: string
}) {
  const url = safeHttpUrl(href)
  if (!url) {
    return <span className={cn('text-xs text-muted-foreground', className)}>No valid source</span>
  }
  const host = url.hostname.replace(/^www\./, '')
  return (
    <a
      href={url.href}
      target="_blank"
      rel="noopener noreferrer"
      title={url.href}
      className={cn(
        'inline-flex items-center gap-1 text-xs font-medium text-primary underline-offset-2 hover:underline',
        className,
      )}
    >
      {label ?? host}
      <ExternalLink className="size-3" aria-hidden />
      <span className="sr-only"> (opens in a new tab)</span>
    </a>
  )
}
