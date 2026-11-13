import { FileCheck2, Lightbulb } from 'lucide-react'
import type { Fact } from '@/api/types'
import { shortUrl } from '@/lib/format'
import { TONE_BADGE } from '@/lib/status'
import { cn } from '@/lib/utils'
import { SourceLink } from './SourceLink'
import { Tooltip } from './ui/tooltip'

/**
 * One statement about a company with its source. Every fact links to where it came from.
 * A guess (kind "inference") is clearly labelled so it is never read as a confirmed fact.
 */
export function FactItem({ fact }: { fact: Fact }) {
  const inference = fact.kind === 'inference'
  const Icon = inference ? Lightbulb : FileCheck2
  return (
    <li className="flex flex-col gap-1.5 border-b border-border py-3 first:pt-0 last:border-0 last:pb-0">
      <div className="flex items-start gap-3">
        <Tooltip
          content={
            inference
              ? 'Our own reading of the site. It is a guess to check, not a confirmed fact.'
              : 'Stated on the source page.'
          }
        >
          <span
            tabIndex={0}
            className={cn(
              'mt-0.5 inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium',
              inference ? TONE_BADGE.warning : TONE_BADGE.success,
            )}
          >
            <Icon className="size-3.5" aria-hidden />
            {inference ? 'Inference' : 'Fact'}
          </span>
        </Tooltip>
        <p className="min-w-0">{fact.text}</p>
      </div>
      <p className="pl-[5.25rem] text-[13px] text-muted-foreground">
        Source: <SourceLink href={fact.sourceUrl} label={shortUrl(fact.sourceUrl)} />
      </p>
    </li>
  )
}
