import {
  CheckCircle2,
  CircleDashed,
  CircleHelp,
  CircleSlash,
  FileEdit,
  Hourglass,
  Loader,
  Lock,
  type LucideIcon,
  ShieldAlert,
  ShieldCheck,
  TriangleAlert,
  XCircle,
} from 'lucide-react'
import type { AiStatus, EmailStatus, StepKey, StepStatus } from '@/api/types'

/** Visual tone. Every tone is ALWAYS shown together with a text label and an icon. */
export type Tone = 'success' | 'info' | 'warning' | 'neutral' | 'danger' | 'muted'

export type StatusMeta = { label: string; tone: Tone; icon: LucideIcon; description: string }

// Records are exhaustive on purpose: adding an enum value breaks the build until it is mapped.
export const STEP_STATUS_META: Record<StepStatus, StatusMeta> = {
  not_started: {
    label: 'Not started',
    tone: 'muted',
    icon: CircleDashed,
    description: 'This step has not run yet.',
  },
  in_progress: {
    label: 'In progress',
    tone: 'info',
    icon: Loader,
    description: 'This step is running now.',
  },
  completed: {
    label: 'Completed',
    tone: 'success',
    icon: CheckCircle2,
    description: 'This step finished.',
  },
  partial: {
    label: 'Partial',
    tone: 'warning',
    icon: TriangleAlert,
    description: 'Only some of the data could be collected.',
  },
  needs_review: {
    label: 'Needs review',
    tone: 'warning',
    icon: FileEdit,
    description: 'A person needs to check this.',
  },
  pending_access: {
    label: 'Pending access',
    tone: 'neutral',
    icon: Hourglass,
    description: 'Waiting for a tool or access we do not have yet.',
  },
  restricted: {
    label: 'Restricted',
    tone: 'neutral',
    icon: Lock,
    description: 'The source does not allow automated access.',
  },
  failed: {
    label: 'Failed',
    tone: 'danger',
    icon: XCircle,
    description: 'This step failed. See the reason.',
  },
  approved: {
    label: 'Approved',
    tone: 'success',
    icon: ShieldCheck,
    description: 'A reviewer approved this.',
  },
}

export const EMAIL_STATUS_META: Record<EmailStatus, StatusMeta> = {
  verified: {
    label: 'Verified',
    tone: 'success',
    icon: ShieldCheck,
    description: 'A permitted check confirmed this address can receive email.',
  },
  risky: {
    label: 'Risky',
    tone: 'warning',
    icon: ShieldAlert,
    description: 'Catch-all or otherwise uncertain deliverability.',
  },
  invalid: {
    label: 'Invalid',
    tone: 'danger',
    icon: XCircle,
    description: 'An approved check reported this address as invalid.',
  },
  unknown: {
    label: 'Unknown',
    tone: 'muted',
    icon: CircleHelp,
    description: 'A check ran but could not tell if the address works.',
  },
  not_checked: {
    label: 'Not checked',
    tone: 'muted',
    icon: CircleSlash,
    description: 'No permitted check has been run. This is not a verified address.',
  },
}

export const AI_STATUS_META: Record<AiStatus, StatusMeta> = {
  pending: {
    label: 'Pending',
    tone: 'neutral',
    icon: Hourglass,
    description: 'Personalization has not been generated yet.',
  },
  insufficient_evidence: {
    label: 'Insufficient evidence',
    tone: 'warning',
    icon: TriangleAlert,
    description: 'Not enough sourced facts to write this safely.',
  },
  draft: { label: 'Draft', tone: 'info', icon: FileEdit, description: 'Waiting for review.' },
  approved: {
    label: 'Approved',
    tone: 'success',
    icon: CheckCircle2,
    description: 'A reviewer approved this copy.',
  },
  rejected: {
    label: 'Rejected',
    tone: 'danger',
    icon: XCircle,
    description: 'A reviewer rejected this copy.',
  },
}

export const STEP_LABEL: Record<StepKey, string> = {
  profile: 'ADIPEC profile',
  website: 'Website',
  social: 'Social profiles',
  account: 'Sales Nav account',
  people: 'Decision-makers',
  emails: 'Emails',
  verification: 'Email verification',
  personalization: 'Personalization',
}

/** Tailwind classes per tone (soft background + strong text from the design tokens). */
export const TONE_BADGE: Record<Tone, string> = {
  success: 'bg-success-soft text-success-ink',
  info: 'bg-info-soft text-info-ink',
  warning: 'bg-warning-soft text-warning-ink',
  neutral: 'bg-neutral-soft text-neutral-ink',
  danger: 'bg-danger-soft text-danger-ink',
  muted: 'bg-muted text-muted-foreground',
}

export const TONE_DOT: Record<Tone, string> = {
  success: 'bg-success',
  info: 'bg-info',
  warning: 'bg-warning',
  neutral: 'bg-neutral',
  danger: 'bg-danger',
  muted: 'bg-border',
}
