export type CompanyTabKey = 'adipec' | 'website' | 'socials' | 'contacts' | 'ai' | 'history'

export const COMPANY_TABS: { key: CompanyTabKey; label: string }[] = [
  { key: 'adipec', label: 'ADIPEC' },
  { key: 'website', label: 'Website' },
  { key: 'socials', label: 'Socials' },
  { key: 'contacts', label: 'Contacts' },
  { key: 'ai', label: 'AI' },
  { key: 'history', label: 'History' },
]

export const isCompanyTab = (value: string | undefined): value is CompanyTabKey =>
  COMPANY_TABS.some((t) => t.key === value)

/** The first tab lives at /companies/:id, the others at /companies/:id/website and so on. */
export const tabPath = (id: string, tab: CompanyTabKey) =>
  tab === 'adipec' ? `/companies/${id}` : `/companies/${id}/${tab}`
