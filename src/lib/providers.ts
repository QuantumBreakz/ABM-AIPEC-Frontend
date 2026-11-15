import type { Providers } from '@/api/types'

export type ProviderInfo = {
  key: keyof Pick<Providers, 'contactout' | 'millionverifier' | 'llm'>
  name: string
  does: string
  /** What the team sees, and has to do by hand, while it is off. */
  whenOff: string
}

/** What each outside tool is for, and what "off" means for the work. Nothing here is a secret. */
export const PROVIDERS: ProviderInfo[] = [
  {
    key: 'contactout',
    name: 'ContactOut',
    does: 'Looks up business emails for people you saved.',
    whenOff:
      'No emails are looked up automatically. The email step stays unfinished and people add emails by hand, each with a source.',
  },
  {
    key: 'millionverifier',
    name: 'MillionVerifier',
    does: 'Checks whether an email address can receive mail.',
    whenOff:
      'The email check only looks at each address’s domain (MX). It cannot mark any email as Verified, so results stay Unknown.',
  },
  {
    key: 'llm',
    name: 'Language model',
    does: 'Writes the company summary, signal and message drafts.',
    whenOff:
      'No drafts are written. The personalization step stays Pending and people write the text by hand.',
  },
]
