import type {
  AiStatus,
  AiVersion,
  Company,
  CompanyAi,
  Contact,
  ContactAi,
  Coverage,
  EmailStatus,
  HistoryEntry,
  Run,
  StepKey,
  StepState,
  StepStatus,
} from '@/api/types'
import { STEP_KEYS } from '@/api/types'
import { refresh } from './derive'
import type { MockDb } from './db'
import { createRng, type Rng, slugify } from './rng'

/**
 * Fake data for the mock backend. Everything is made up (fake names, example.com).
 * It is generated from a fixed seed, so it is the same on every run.
 */

const NOW = Date.now()
const ago = (minutes: number) => new Date(NOW - minutes * 60_000).toISOString()

const FIRST = [
  'Aisha',
  'Omar',
  'Layla',
  'Khalid',
  'Sara',
  'Yusuf',
  'Mariam',
  'Tariq',
  'Noor',
  'Hassan',
]
const LAST = [
  'Haddad',
  'Rahman',
  'Nasser',
  'Farouk',
  'Saleh',
  'Mansour',
  'Aziz',
  'Darwish',
  'Karimi',
]
const PREFIX = [
  'Al Noor',
  'Gulf',
  'Atlas',
  'Nova',
  'Desert',
  'Pearl',
  'Falcon',
  'Horizon',
  'Summit',
  'Zenith',
  'Orbit',
  'Delta',
  'Meridian',
  'Apex',
  'Cedar',
  'Titan',
  'Vega',
  'Crescent',
  'Sahara',
  'Oryx',
]
const CORE = [
  'Energy',
  'Petroleum',
  'Drilling',
  'Offshore',
  'Subsea',
  'Pipeline',
  'Oilfield',
  'Marine',
  'Engineering',
  'Logistics',
  'Power',
  'Gas',
  'Refining',
  'Industrial',
  'Services',
]
const SUFFIX = ['LLC', 'Ltd', 'Group', 'Co.', 'FZE', 'International', 'Holdings', '']
const COUNTRIES = [
  'AE',
  'SA',
  'QA',
  'KW',
  'OM',
  'BH',
  'EG',
  'NG',
  'GB',
  'US',
  'NO',
  'IN',
  'CN',
  'IT',
  'DE',
  'TR',
]
const CATEGORIES = [
  'Drilling & Well Services',
  'Oil & Gas Production',
  'Midstream & Pipelines',
  'Refining & Petrochemicals',
  'Digital & Automation',
  'Environmental & Sustainability',
  'Equipment & Supply',
  'Engineering & Construction',
  'Offshore & Marine',
  'Energy Services',
]
const TITLES: [string, string][] = [
  ['Chief Executive Officer', 'CXO'],
  ['Chief Technology Officer', 'CXO'],
  ['Chief Financial Officer', 'CXO'],
  ['Chief Operating Officer', 'CXO'],
  ['Chief Digital Officer', 'CXO'],
  ['VP Operations', 'VP'],
  ['Head of IT', 'Director'],
  ['Director of Engineering', 'Director'],
]
const SERVICES = [
  'Well intervention',
  'Subsea inspection',
  'Pipeline integrity',
  'Drilling fluids',
  'Process automation',
  'Asset management',
  'Remote monitoring',
  'Logistics and supply',
  'Environmental consulting',
  'Engineering design',
  'Equipment rental',
  'Safety training',
]
const MARKETS = [
  'Middle East',
  'North Africa',
  'Europe',
  'South Asia',
  'North America',
  'West Africa',
]

type Scenario = {
  stages: Partial<Record<StepKey, [StepStatus, string?]>>
  website: 'full' | 'offline' | 'partial' | 'ambiguous'
  contacts: number
  emails: EmailStatus[]
  coverage: Coverage
  ai: AiStatus
  contactAi: AiStatus
  duplicate?: boolean
  multiEdition?: boolean
  locked?: boolean
  minimalProfile?: boolean
  priorApproved?: boolean
}

const sc = (o: Partial<Scenario>): Scenario => ({
  stages: {},
  website: 'full',
  contacts: 0,
  emails: ['not_checked'],
  coverage: 'unknown',
  ai: 'pending',
  contactAi: 'pending',
  ...o,
})

const NO_SALESNAV = 'No Sales Navigator seat is available yet.'

/** Seventeen situations; company number i uses scenario i % 17. Together they cover every status. */
const SCENARIOS: Scenario[] = [
  // 0: everything finished
  sc({
    stages: {
      profile: ['completed'],
      website: ['completed'],
      social: ['completed'],
      account: ['completed'],
      people: ['completed'],
      emails: ['completed'],
      verification: ['completed'],
      personalization: ['completed'],
    },
    contacts: 3,
    emails: ['verified', 'verified', 'risky'],
    coverage: 'reviewed',
    ai: 'approved',
    contactAi: 'approved',
    multiEdition: true,
  }),
  // 1: website offline
  sc({
    stages: {
      profile: ['completed'],
      website: ['failed', 'Website did not respond (timed out after 30 s).'],
      social: ['partial', 'Only the LinkedIn page was found.'],
      account: ['pending_access', NO_SALESNAV],
      people: ['pending_access', NO_SALESNAV],
    },
    website: 'offline',
    ai: 'insufficient_evidence',
  }),
  // 2: site blocks automated access
  sc({
    stages: {
      profile: ['completed'],
      website: ['restricted', 'robots.txt does not allow automated access.'],
      social: ['not_started'],
      account: ['pending_access', NO_SALESNAV],
      people: ['pending_access', NO_SALESNAV],
    },
    website: 'offline',
  }),
  // 3: research done, waiting on Sales Navigator
  sc({
    stages: {
      profile: ['completed'],
      website: ['completed'],
      social: ['completed'],
      account: ['pending_access', NO_SALESNAV],
      people: ['pending_access', NO_SALESNAV],
      personalization: ['needs_review'],
    },
    ai: 'draft',
  }),
  // 4: partial research, ambiguous account match
  sc({
    stages: {
      profile: ['completed'],
      website: ['partial', 'Only 2 of 6 pages could be read.'],
      social: ['partial'],
      account: ['needs_review', 'Two Sales Navigator accounts match this name.'],
    },
    website: 'partial',
    ai: 'insufficient_evidence',
  }),
  // 5: contacts found, emails not checked yet
  sc({
    stages: {
      profile: ['completed'],
      website: ['completed'],
      social: ['completed'],
      account: ['completed'],
      people: ['partial', 'Relationship Explorer showed a limited set.'],
      emails: ['completed'],
      verification: ['not_started'],
      personalization: ['needs_review'],
    },
    contacts: 2,
    emails: ['not_checked'],
    coverage: 'confirmed_partial',
    ai: 'draft',
    contactAi: 'draft',
  }),
  // 6: mixed email results
  sc({
    stages: {
      profile: ['completed'],
      website: ['completed'],
      social: ['completed'],
      account: ['completed'],
      people: ['completed'],
      emails: ['completed'],
      verification: ['partial', 'MX check only: deliverability not confirmed.'],
      personalization: ['needs_review'],
    },
    contacts: 3,
    emails: ['invalid', 'risky', 'unknown'],
    coverage: 'reviewed',
    ai: 'approved',
    contactAi: 'draft',
  }),
  // 7: not enough facts to personalize
  sc({
    stages: {
      profile: ['completed'],
      website: ['partial'],
      social: ['not_started'],
      account: ['completed'],
      people: ['completed'],
      emails: ['completed'],
      personalization: ['needs_review'],
    },
    website: 'partial',
    contacts: 1,
    emails: ['not_checked'],
    coverage: 'confirmed_partial',
    ai: 'insufficient_evidence',
    contactAi: 'insufficient_evidence',
  }),
  // 8: reviewer rejected the draft
  sc({
    stages: {
      profile: ['completed'],
      website: ['completed'],
      social: ['completed'],
      account: ['completed'],
      people: ['completed'],
      emails: ['completed'],
      verification: ['completed'],
      personalization: ['needs_review'],
    },
    contacts: 2,
    emails: ['verified', 'unknown'],
    coverage: 'reviewed',
    ai: 'rejected',
    contactAi: 'rejected',
    priorApproved: true,
  }),
  // 9: running now
  sc({
    stages: {
      profile: ['completed'],
      website: ['in_progress'],
      social: ['in_progress'],
    },
    website: 'partial',
  }),
  // 10: ambiguous website
  sc({
    stages: {
      profile: ['partial', 'ADIPEC profile has no website listed.'],
      website: ['needs_review', 'Two possible websites found; a person must choose.'],
    },
    website: 'ambiguous',
  }),
  // 11: ADIPEC profile page failed
  sc({
    stages: { profile: ['failed', 'Profile page returned 404.'] },
    website: 'ambiguous',
    minimalProfile: true,
  }),
  // 12: possible duplicate of another company
  sc({
    stages: { profile: ['completed'], website: ['partial'], social: ['partial'] },
    website: 'partial',
    duplicate: true,
  }),
  // 13: everything approved
  sc({
    stages: {
      profile: ['approved'],
      website: ['approved'],
      social: ['approved'],
      account: ['approved'],
      people: ['approved'],
      emails: ['approved'],
      verification: ['completed'],
      personalization: ['approved'],
    },
    contacts: 2,
    emails: ['verified', 'verified'],
    coverage: 'reviewed',
    ai: 'approved',
    contactAi: 'approved',
  }),
  // 14: has human edits (locked fields)
  sc({
    stages: {
      profile: ['completed'],
      website: ['completed'],
      social: ['completed'],
      account: ['completed'],
      people: ['completed'],
      emails: ['completed'],
      verification: ['completed'],
      personalization: ['completed'],
    },
    contacts: 1,
    emails: ['verified'],
    coverage: 'reviewed',
    ai: 'approved',
    contactAi: 'approved',
    locked: true,
  }),
  // 15: no contacts found after review
  sc({
    stages: {
      profile: ['completed'],
      website: ['completed'],
      social: ['completed'],
      account: ['completed'],
      people: ['needs_review', 'No decision-makers found after review.'],
    },
    coverage: 'unknown',
    ai: 'draft',
  }),
  // 16: several contacts, drafts waiting
  sc({
    stages: {
      profile: ['completed'],
      website: ['completed'],
      social: ['completed'],
      account: ['completed'],
      people: ['completed'],
      emails: ['completed'],
      verification: ['not_started'],
      personalization: ['needs_review'],
    },
    contacts: 3,
    emails: ['not_checked', 'not_checked', 'unknown'],
    coverage: 'confirmed_partial',
    ai: 'draft',
    contactAi: 'draft',
  }),
]

function pickUniqueName(rng: Rng, used: Set<string>, i: number) {
  for (let attempt = 0; attempt < 20; attempt++) {
    const name = `${rng.pick(PREFIX)} ${rng.pick(CORE)} ${rng.pick(SUFFIX)}`.trim()
    if (!used.has(name)) {
      used.add(name)
      return name
    }
  }
  const name = `Sample Energy ${i}`
  used.add(name)
  return name
}

function version(fields: Record<string, string>, by: string, minutes: number): AiVersion {
  return { fields, by, at: ago(minutes) }
}

function companyAiFields(name: string, services: string[], url: string) {
  const first = services[0] ?? 'energy services'
  return {
    summary: `${name} provides ${first.toLowerCase()} and related services. It lists ${services.length} service lines on its website.`,
    signal: `Offers ${first.toLowerCase()} (listed on the services page).`,
    signalUrl: `${url}/services`,
    hypothesis: `Teams delivering ${first.toLowerCase()} may be coordinating work across several tools. This is a guess to check, not a known problem.`,
    hyperPersonalization: `Noticed ${name} lists ${first.toLowerCase()} among its services. Curious how field and office teams share information day to day.`,
  }
}

function buildCompanyAi(
  status: AiStatus,
  name: string,
  services: string[],
  url: string,
  prior: boolean,
): CompanyAi {
  const fields = companyAiFields(name, services, url)
  const base = { evidenceUrls: [`${url}/services`, `${url}/about`] }
  switch (status) {
    case 'pending':
      return { status, reason: 'Personalization has not run yet.', evidenceUrls: [], versions: [] }
    case 'insufficient_evidence':
      return {
        status,
        reason: 'No sourced company fact is available to cite, so no draft was written.',
        evidenceUrls: [],
        versions: [],
      }
    case 'draft': {
      const v = version(fields, 'ai', 90)
      return { status, ...fields, ...base, versions: [v] }
    }
    case 'approved': {
      const v1 = version(fields, 'ai', 600)
      const v2 = version(
        {
          ...fields,
          hyperPersonalization: `${fields.hyperPersonalization} (edited by a reviewer)`,
        },
        'reviewer@example.com',
        300,
      )
      return { status, ...fields, ...base, approved: v2, versions: [v2, v1] }
    }
    case 'rejected': {
      const v1 = version(fields, 'ai', 800)
      return {
        status,
        reason: 'Too generic: does not mention a specific product.',
        ...fields,
        ...base,
        approved: prior ? v1 : undefined,
        versions: [version({ ...fields, summary: 'Generic summary.' }, 'ai', 120), v1],
      }
    }
  }
}

function buildContactAi(
  status: AiStatus,
  first: string,
  name: string,
  service: string,
  url: string,
): ContactAi {
  const fields = {
    subject: `Question about ${service.toLowerCase()} at ${name}`,
    draft: `Hello ${first},\n\nI saw that ${name} offers ${service.toLowerCase()}. How do your teams currently share job information between the field and the office?\n\nBest regards`,
    linkedinDraft: `Hi ${first}, I read about ${name}'s ${service.toLowerCase()} work and had a question about how your teams coordinate.`,
  }
  const evidenceUrls = [`${url}/services`]
  switch (status) {
    case 'pending':
      return { status, reason: 'Draft has not been generated yet.', evidenceUrls: [], versions: [] }
    case 'insufficient_evidence':
      return {
        status,
        reason: 'Not enough sourced facts about this person or company.',
        evidenceUrls: [],
        versions: [],
      }
    case 'draft':
      return { status, ...fields, evidenceUrls, versions: [version(fields, 'ai', 80)] }
    case 'approved': {
      const v = version(fields, 'reviewer@example.com', 200)
      return { status, ...fields, evidenceUrls, approved: v, versions: [v] }
    }
    case 'rejected': {
      const v = version(fields, 'ai', 500)
      return {
        status,
        reason: 'Tone is too pushy.',
        ...fields,
        evidenceUrls,
        versions: [version({ ...fields, subject: 'Quick question' }, 'ai', 100), v],
      }
    }
  }
}

function buildContact(
  rng: Rng,
  company: Company,
  index: number,
  emailStatus: EmailStatus,
  aiStatus: AiStatus,
  seq: number,
): Contact {
  const first = FIRST[(seq + index) % FIRST.length] as string
  const last = LAST[(seq * 3 + index) % LAST.length] as string
  const [title, seniority] = TITLES[(seq + index * 2) % TITLES.length] as [string, string]
  const domain = company.domain ?? 'example.com'
  const checked = emailStatus !== 'not_checked'
  const url = company.website.url ?? `https://${domain}`
  return {
    id: `p_${String(seq * 10 + index).padStart(4, '0')}`,
    companyId: company.id,
    firstName: first,
    lastName: last,
    title,
    seniority,
    profileUrl: `https://www.linkedin.com/in/example-${slugify(`${first}-${last}`)}-${seq}${index}`,
    geography: company.country,
    matchConfidence: rng.pick(['high', 'medium', 'low'] as const),
    source: rng.pick(['manual', 'csv_import', 'contactout']),
    emails: [
      {
        address: `${first}.${last}@${domain}`.toLowerCase(),
        type: 'business',
        provider: rng.pick(['contactout', 'manual']),
        capturedAt: ago(rng.int(60, 60 * 48)),
        verification: checked
          ? {
              status: emailStatus,
              checkedAt: ago(rng.int(10, 600)),
              source: emailStatus === 'unknown' ? 'mx-check' : 'millionverifier',
            }
          : { status: 'not_checked' },
      },
    ],
    ai: buildContactAi(
      aiStatus,
      first,
      company.name,
      SERVICES[(seq + index) % SERVICES.length] as string,
      url,
    ),
    createdAt: ago(60 * 24),
    updatedAt: ago(rng.int(10, 600)),
  }
}

export function buildSeed(
  count = 150,
): Pick<
  MockDb,
  'users' | 'events' | 'companies' | 'history' | 'runs' | 'exportLog' | 'suppressions' | 'providers'
> {
  const rng = createRng(20261113)
  const usedNames = new Set<string>()
  const usedSlugs = new Set<string>()
  const companies: Company[] = []
  const history: Record<string, HistoryEntry[]> = {}

  for (let i = 0; i < count; i++) {
    const scenario = SCENARIOS[i % SCENARIOS.length] as Scenario
    const name = pickUniqueName(rng, usedNames, i)
    let slug = slugify(name.replace(/ (LLC|Ltd|Group|Co\.|FZE|International|Holdings)$/i, ''))
    if (usedSlugs.has(slug)) slug = `${slug}-${i}`
    usedSlugs.add(slug)

    const hasDomain = scenario.website !== 'ambiguous'
    const domain = hasDomain ? `${slug}.example.com` : undefined
    const url = domain ? `https://${domain}` : undefined
    const country = rng.pick(COUNTRIES)
    const category = rng.pick(CATEGORIES)
    const services = [rng.pick(SERVICES), rng.pick(SERVICES), rng.pick(SERVICES)].filter(
      (s, idx, all) => all.indexOf(s) === idx,
    )
    const markets = [rng.pick(MARKETS), rng.pick(MARKETS)].filter(
      (m, idx, all) => all.indexOf(m) === idx,
    )

    const stages = Object.fromEntries(
      STEP_KEYS.map((key) => [key, { status: 'not_started' } as StepState]),
    ) as Record<StepKey, StepState>
    for (const key of STEP_KEYS) {
      const entry = scenario.stages[key]
      if (!entry) continue
      stages[key] = { status: entry[0], reason: entry[1], updatedAt: ago(rng.int(5, 60 * 24 * 5)) }
    }

    const editions = [
      {
        edition: 2026,
        profileUrl: `https://www.example.com/adipec/2026/exhibitors/${slug}`,
        stand: scenario.minimalProfile
          ? undefined
          : `Hall ${rng.int(1, 12)} · ${rng.int(100, 999)}`,
        category: scenario.minimalProfile ? undefined : category,
        country: scenario.minimalProfile ? undefined : country,
        description: scenario.minimalProfile ? undefined : `Sample exhibitor profile for ${name}.`,
        extra: scenario.minimalProfile
          ? undefined
          : { Hall: `Hall ${rng.int(1, 12)}`, Sector: category },
        capturedAt: ago(60 * 24 * 3),
      },
    ]
    if (scenario.multiEdition) {
      editions.push({
        edition: 2025,
        profileUrl: `https://www.example.com/adipec/2025/exhibitors/${slug}`,
        stand: `Hall ${rng.int(1, 12)} · ${rng.int(100, 999)}`,
        category,
        country,
        description: `Earlier profile for ${name}.`,
        extra: { Hall: `Hall ${rng.int(1, 12)}`, Sector: category },
        capturedAt: ago(60 * 24 * 300),
      })
    }

    const siteOk = scenario.website === 'full' || scenario.website === 'partial'
    const facts =
      scenario.website === 'full'
        ? [
            {
              text: `${name} offers ${services[0]?.toLowerCase()}.`,
              sourceUrl: `${url}/services`,
              kind: 'fact' as const,
            },
            {
              text: `Operates in ${markets.join(' and ')}.`,
              sourceUrl: `${url}/about`,
              kind: 'fact' as const,
            },
            {
              text: 'Announced an expansion of regional operations.',
              sourceUrl: `${url}/news`,
              kind: 'fact' as const,
            },
            {
              text: 'May be modernising field-operations software.',
              sourceUrl: `${url}/about`,
              kind: 'inference' as const,
            },
          ]
        : scenario.website === 'partial'
          ? [
              {
                text: `Lists ${services[0]?.toLowerCase()} on its home page.`,
                sourceUrl: `${url}`,
                kind: 'fact' as const,
              },
            ]
          : []

    const website: Company['website'] = {
      url,
      summary: siteOk
        ? `${name} is a ${category.toLowerCase()} business serving ${markets.join(' and ')}.`
        : undefined,
      services: siteOk ? services : [],
      markets: siteOk ? markets : [],
      contactDetails: siteOk
        ? {
            emails: scenario.website === 'full' ? [`info@${domain}`] : [],
            phones: scenario.website === 'full' ? ['+971 4 000 0000'] : [],
            addresses: scenario.website === 'full' ? [`Business Bay, ${country}`] : [],
            sourceUrl: `${url}/contact`,
          }
        : { emails: [], phones: [], addresses: [] },
      pagesReviewed: siteOk
        ? ['', '/about', '/services', '/contact']
            .slice(0, scenario.website === 'full' ? 4 : 1)
            .map((p) => ({
              url: `${url}${p}`,
              fetchedAt: ago(60 * 24),
            }))
        : [],
      skipped: siteOk
        ? [{ url: `${url}/customer-portal`, reason: 'Requires login.' }]
        : url
          ? [{ url, reason: 'Site did not respond.' }]
          : [],
      facts,
    }

    const id = `c_${String(i + 1).padStart(3, '0')}`
    const company: Company = {
      id,
      name,
      domain,
      originalNames: scenario.multiEdition ? [name, name.toUpperCase()] : [name],
      editions,
      stages,
      contactsCount: 0,
      emailsByStatus: {},
      aiStatus: scenario.ai,
      duplicateOf: scenario.duplicate && i > 0 ? `c_${String(i).padStart(3, '0')}` : undefined,
      completeness: 0,
      updatedAt: ago(rng.int(5, 60 * 24 * 4)),
      website,
      socials: {
        linkedin:
          stages.social.status === 'not_started'
            ? undefined
            : `https://www.linkedin.com/company/${slug}`,
        facebook:
          stages.social.status === 'completed' ? `https://www.facebook.com/${slug}` : undefined,
        instagram:
          stages.social.status === 'completed' && rng.chance(0.5)
            ? `https://www.instagram.com/${slug}`
            : undefined,
        x:
          stages.social.status === 'completed' && rng.chance(0.5)
            ? `https://x.com/${slug}`
            : undefined,
        youtube: undefined,
        other: [],
      },
      salesNav: {
        searchUrl: `https://www.linkedin.com/sales/search/company?query=${encodeURIComponent(name)}`,
        accountUrl:
          stages.account.status === 'completed' || stages.account.status === 'approved'
            ? `https://www.linkedin.com/sales/company/${900000 + i}`
            : undefined,
        matchConfidence:
          stages.account.status === 'completed' || stages.account.status === 'approved'
            ? rng.pick(['high', 'medium'] as const)
            : undefined,
      },
      leadershipCoverage: scenario.coverage,
      lockedFields: scenario.locked ? ['website.summary', 'socials.linkedin'] : [],
      ai: buildCompanyAi(
        scenario.ai,
        name,
        services,
        url ?? `https://${slug}.example.com`,
        !!scenario.priorApproved,
      ),
      contacts: [],
    }

    company.contacts = Array.from({ length: scenario.contacts }, (_, k) =>
      buildContact(
        rng,
        company,
        k,
        scenario.emails[k % scenario.emails.length] as EmailStatus,
        scenario.contactAi,
        i + 1,
      ),
    )
    refresh(company)
    companies.push(company)

    if (scenario.locked) {
      history[id] = [
        {
          field: 'website.summary',
          before: 'Auto summary.',
          after: company.website.summary,
          by: 'reviewer@example.com',
          at: ago(60 * 5),
        },
        {
          field: 'socials.linkedin',
          before: undefined,
          after: company.socials.linkedin,
          by: 'admin@example.com',
          at: ago(60 * 9),
        },
      ]
    }
  }

  const discovered = companies.filter((c) => c.editions.some((e) => e.edition === 2026)).length
  const stepList: Run['steps'] = ['directory', ...STEP_KEYS]
  const makeRun = (
    id: string,
    edition: number,
    status: Run['status'],
    progress: number,
    createdMinutesAgo: number,
  ): Run => {
    const perStep: Run['perStep'] = {}
    for (const step of stepList) {
      const done = Math.round(discovered * progress)
      const failed = step === 'website' ? Math.round(done * 0.05) : 0
      perStep[step] = { queued: discovered - done - failed, done, failed }
    }
    const done = Math.round(discovered * progress)
    return {
      id,
      edition,
      status,
      steps: stepList,
      startedBy: 'admin@example.com',
      createdAt: ago(createdMinutesAgo),
      finishedAt:
        status === 'completed' || status === 'failed' ? ago(createdMinutesAgo - 90) : undefined,
      counts: {
        discovered,
        attempted: done,
        completed: Math.round(done * 0.7),
        partial: Math.round(done * 0.15),
        restricted: Math.round(done * 0.05),
        failed: Math.round(done * 0.05),
        duplicate: companies.filter((c) => c.duplicateOf).length,
      },
      perStep,
      errors:
        status === 'failed' || status === 'running'
          ? [
              {
                companyId: 'c_002',
                companyName: companies[1]?.name,
                step: 'website',
                message: 'Website did not respond (timed out after 30 s).',
                at: ago(25),
              },
            ]
          : [],
    }
  }

  return {
    users: [
      {
        id: 'u_1',
        email: 'admin@example.com',
        role: 'admin',
        createdAt: ago(60 * 24 * 90),
        password: 'password',
      },
      {
        id: 'u_2',
        email: 'reviewer@example.com',
        role: 'reviewer',
        createdAt: ago(60 * 24 * 60),
        password: 'password',
      },
    ],
    events: [
      {
        id: 'e_2026',
        edition: 2026,
        name: 'ADIPEC 2026',
        directoryUrl: 'https://www.example.com/adipec/2026/exhibitors',
        advertisedCount: 2250,
      },
      {
        id: 'e_2025',
        edition: 2025,
        name: 'ADIPEC 2025',
        directoryUrl: 'https://www.example.com/adipec/2025/exhibitors',
      },
    ],
    companies,
    history,
    runs: [
      makeRun('r_4', 2026, 'running', 0.35, 40),
      makeRun('r_3', 2025, 'paused', 0.5, 60 * 30),
      makeRun('r_2', 2025, 'completed', 1, 60 * 24 * 20),
      makeRun('r_1', 2025, 'failed', 0.2, 60 * 24 * 40),
    ],
    exportLog: [
      {
        id: 'x_1',
        kind: 'outreach',
        version: 'initial',
        filters: { edition: 2025 },
        rows: 120,
        by: 'admin@example.com',
        at: ago(60 * 24 * 18),
      },
    ],
    suppressions: [
      {
        id: 's_1',
        value: 'optout@example.com',
        reason: 'Asked not to be contacted.',
        at: ago(60 * 24 * 5),
      },
    ],
    providers: { contactout: false, millionverifier: false, llm: true, llmModel: 'mock-llm' },
  }
}
