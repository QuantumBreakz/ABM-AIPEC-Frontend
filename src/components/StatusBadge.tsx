import type { AiStatus, EmailStatus, Run, StepStatus } from '@/api/types'
import {
  AI_STATUS_META,
  EMAIL_STATUS_META,
  RUN_STATUS_META,
  STEP_STATUS_META,
  type StatusMeta,
  TONE_BADGE,
} from '@/lib/status'
import { cn } from '@/lib/utils'
import { Tooltip } from './ui/tooltip'

type Props =
  | { kind: 'step'; status: StepStatus; reason?: string; className?: string }
  | { kind: 'email'; status: EmailStatus; reason?: string; className?: string }
  | { kind: 'ai'; status: AiStatus; reason?: string; className?: string }
  | { kind: 'run'; status: Run['status']; reason?: string; className?: string }

function metaFor(props: Props): StatusMeta {
  switch (props.kind) {
    case 'step':
      return STEP_STATUS_META[props.status]
    case 'email':
      return EMAIL_STATUS_META[props.status]
    case 'ai':
      return AI_STATUS_META[props.status]
    case 'run':
      return RUN_STATUS_META[props.status]
  }
}

/**
 * Status pill. Colour is never the only signal: every badge has an icon AND a text label.
 * Hover or focus shows what the status means plus the reason, if there is one.
 */
export function StatusBadge(props: Props) {
  const meta = metaFor(props)
  const Icon = meta.icon
  return (
    <Tooltip
      content={
        <>
          <span className="block font-medium">{meta.label}</span>
          <span className="block opacity-90">{meta.description}</span>
          {props.reason && <span className="mt-1 block opacity-90">Reason: {props.reason}</span>}
        </>
      }
    >
      <span
        tabIndex={0}
        className={cn(
          'inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium whitespace-nowrap',
          TONE_BADGE[meta.tone],
          props.className,
        )}
      >
        <Icon
          className={cn(
            'size-3.5',
            props.kind === 'run' && props.status === 'running' && 'animate-spin',
          )}
          aria-hidden
        />
        {meta.label}
      </span>
    </Tooltip>
  )
}
