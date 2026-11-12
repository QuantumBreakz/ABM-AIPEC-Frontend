# ADIPEC Lead Gen — Frontend Plan

**Owner: Faseeh** · Backend lives in [ABM-AIPEC-Backend](https://github.com/QuantumBreakz/ABM-AIPEC-Backend) (Ali Ahmed)

## The project in short

We pull every exhibitor from the ADIPEC site and read their website. A person finds the decision-makers in Sales Navigator, and the system finds emails where an approved tool exists. The AI writes research notes and drafts that a reviewer approves. We export a first CSV, check the emails in a batch, and export a final CSV.

Things the system must always do:

- **Never drop a company.** If a step fails, record why and move on.
- **Never make things up.** Every fact keeps its source link. Unknown means an explicit status, not an empty cell.
- **No new spending.** Paid tools are used only if we already have them. Without one, the step says "Pending Access" or "Not Checked".
- **No automation on LinkedIn or Sales Navigator.** A person does that part in our app.
- **No automatic email sending.** We produce drafts only.

Codes like FR-05, NFR-07, AT-03 or Gate 2 point to the PTC v3.0 requirements doc.

## Who owns what

| | Ali — Backend | Faseeh — Frontend |
|---|---|---|
| Repo | `ABM-AIPEC-Backend` | `ABM-AIPEC-Frontend` |
| Runs on | Render (free web service) + Render Key Value + MongoDB Atlas M0 | Vercel (Hobby) |
| Builds | API, data, scraping, queues, AI, email checks, CSV exports, cron | Every screen, mock backend, user flows, exports page |
| Depends on the other for | Nothing | Only the API contract (frozen in ticket J-0.1) |

### How we stay unblocked

- **The contract comes first** (J-0.1). After that, nobody waits on anybody.
- **Frontend runs on a mock backend** (MSW) built from the contract. Every screen can be built, demoed and tested with no backend running. Vercel preview deploys use the mocks.
- **Backend runs on seed data** (`npm run seed`). Every endpoint can be built and tested before the scrapers exist.
- **Integration checks** (J-1 … J-6) happen when both sides of a phase are done. They catch mismatches but never block starting the next phase.
- Contract changes follow the change rules in the contract section.

## Phases

Each phase ends at a release gate from the PTC. Within a phase, the two sides work in parallel.

| Phase | Goal | Gate | Acceptance tests |
|---|---|---|---|
| 0 Foundations | Repos, hosting, contract, auth, mocks/seed | – | – |
| 1 Exhibitors | Every exhibitor listed and its profile captured | Gate 1 Source proof | AT-01, AT-02 |
| 2 Company research | Website facts, socials, duplicates, review queue | Gate 2 Research proof | AT-03, AT-10 |
| 3 People | Sales Nav review flow, contacts, email lookup | Gate 3 People proof | AT-04, AT-05, AT-06, AT-09 |
| 4 AI + first CSV | Sourced drafts, review/approve, exports | Gate 5 Personalization proof | AT-08, AT-11 (initial) |
| 5 Email check + final CSV | Batch verification, final export | Gate 4 Verification proof | AT-07, AT-11 (final) |
| 6 Hardening & delivery | Gap report, security, backups, acceptance run, docs | Gate 6 Delivery proof | AT-12 + full AT-01…12 run |

## Hosting and the limits that touch the UI

| Thing | What it means for the frontend |
|---|---|
| Vercel Hobby (free) | Static Vite build plus free preview deploys per PR. Hobby is meant for non-commercial use. If that matters, the same build goes on a Render Static Site. |
| `/api` rewrite | `vercel.json` forwards `/api/*` to the Render backend. The browser sees one site, so the login cookie just works. No CORS, no tokens in JS. |
| Render free sleeps | The first request after ~15 idle minutes can take ~1 min, or return 502/503 or an HTML "waking up" page. The API client retries for up to 90 s and shows a **"Server is waking up…"** banner. |
| Mocks on previews | Preview deploys build with `VITE_API_MOCK=true`, so every PR can be clicked through without a backend. Production builds with `false` once the backend is live. |
| Env vars are baked at build time | Changing `VITE_*` on Vercel needs a redeploy. |

```json
// vercel.json
{
  "rewrites": [
    { "source": "/api/:path*", "destination": "https://<render-service>.onrender.com/:path*" },
    { "source": "/(.*)", "destination": "/index.html" }
  ]
}
```

## Stack

| Need | Choice | Why |
|---|---|---|
| Build | Vite + React 19 + TypeScript | Fast, static output for Vercel |
| Routing | React Router | Standard; nested layouts |
| Server data | TanStack Query | Caching, polling, retries, mutations |
| Tables | TanStack Table | Server-side paging/sort, big lists |
| UI | Tailwind + shadcn/ui (Radix underneath) | Accessible components we own and can edit |
| Forms | react-hook-form + zod | Same validation style as the backend |
| Mock backend | MSW (Mock Service Worker) | Works in the browser, dev, tests and previews |
| Toasts | sonner | Small, works with shadcn |
| Tests | Vitest + Testing Library; Playwright for smoke e2e | Unit + real-browser checks |
| Lint/format | Biome | One tool, fast |

## Folder layout

```
src/
  main.tsx              starts MSW when VITE_API_MOCK=true, then renders
  App.tsx               routes
  api/
    types.ts            copy of the contract types (keep in sync)
    client.ts           fetch wrapper: /api base, cookie, error parsing, waking retry
    queries/            one file per resource: useCompanies(), useCompany(), useRuns(), ...
  mocks/
    browser.ts          MSW setup
    handlers/           one file per resource, mirrors the contract
    db.ts               in-memory fake data + generator
  auth/                 AuthProvider, RequireAuth, RequireRole, useMe()
  components/           DataTable, FilterBar, StatusBadge, StepDots, SourceLink, EmptyState,
                        ErrorState, Skeleton, ConfirmDialog, Drawer, DateTime, WakingBanner, PageHeader
  pages/                Login, Overview, Runs, RunDetail, Companies, CompanyDetail/*, Review/*,
                        AiReview, Exports, Admin/{Users,Providers,Suppressions,GapReport}, NotFound
  lib/                  format helpers, filter <-> URL helpers
e2e/                    Playwright smoke tests (run against mocks)
```

## Environment variables

| Name | Value |
|---|---|
| `VITE_API_MOCK` | `true` locally and on previews; `false` in production once the backend is live |
| `VITE_API_BASE` | `/api` (only change for odd setups) |

## Screen map

| Route | Screen | Who |
|---|---|---|
| `/login` | Login | anyone |
| `/` | Overview | user |
| `/runs`, `/runs/:id` | Runs and run detail | user (start/pause: admin) |
| `/companies` | Company list | user |
| `/companies/:id` | Company detail (tabs: ADIPEC · Website · Socials · Contacts · AI · History) | user |
| `/review/:type` | Review queue (website · duplicate · salesnav · contacts · emails · ai) | user |
| `/ai/:companyId` | AI review | user |
| `/exports` | Exports + export history | user (verification trigger: admin) |
| `/admin/users`, `/admin/providers`, `/admin/suppressions`, `/admin/gap-report` | Admin | admin (gap report: user) |

## UI rules

- **Statuses are never colour-only.** Every badge has a text label. Colours: completed/approved green · in_progress blue · partial/needs_review amber · pending_access/restricted slate · failed red · not_started grey. Email: verified green · risky amber · invalid red · unknown/not_checked grey.
- **Every reason is shown.** If a step has a `reason`, show it in a tooltip on the dot and in full on the detail page.
- **Every fact links to its source.** Use `SourceLink` (opens a new tab, `rel="noopener noreferrer"`, shows the domain). Facts marked `inference` get an "Inference" badge.
- **Missing data looks missing.** Show "Not available" plus the step reason, never an empty cell that looks fine.
- **Filters live in the URL** (`?country=AE&stepStatus=failed`), so links can be shared and the back button works.
- **Every data view has four states:** loading skeleton, empty (with a hint), error (with retry), data.
- **Admin-only actions are hidden** for reviewers, and the backend checks anyway.
- Desktop first: has to work well from 1280 px wide. Mobile only needs to not break.
- Accessibility: everything works by keyboard, focus is visible, every input has a label, dialogs trap focus (Radix does this), contrast meets WCAG AA.

## Running locally

```bash
npm i
npm run dev            # VITE_API_MOCK=true by default in .env.development
npm test               # unit
npm run e2e            # Playwright on mocks
```
To use the real backend: run it on `:4000`, set `VITE_API_MOCK=false`. The Vite dev proxy sends `/api` → `http://localhost:4000`, the same as the Vercel rewrite.

---

## Frontend tickets

Each ticket lists what it **needs** first. Those are only frontend tickets or J-0.1, never backend work.

### Phase 0 — Foundations

**FE-0.1 Project setup**
Vite + React + TS, Tailwind, shadcn/ui init, Biome, Vitest, path alias `@/`, the folder layout above, Vite dev proxy for `/api`. CI (`ci.yml`): lint, typecheck, test, build. Branch protection on `main`.
- [ ] `npm run dev`, `build`, `test`, `lint` all work
- [ ] CI is required for merging

**FE-0.2 Vercel**
Connect the repo, add `vercel.json` (rewrite + SPA fallback), set `VITE_API_MOCK=true` for Preview and for now for Production too.
Needs: FE-0.1
- [ ] Production URL loads; deep links like `/companies/123` don't 404
- [ ] Each PR gets a preview link

**FE-0.3 API client**
`api/types.ts` (copied from the contract) and `api/client.ts`:
- base `/api`, `credentials: 'include'`, JSON in/out
- turns error responses into an `ApiError { status, code, message, details }`
- 401 → clear the user and go to `/login?next=…`
- **waking retry:** on a network error, 502/503/504, or an HTML response to an API call, retry every 3 s for up to 90 s while the `WakingBanner` shows; then give up with a clear error
- QueryClient defaults: no retry on 4xx; `staleTime` of 30 s for lists

Needs: FE-0.1
- [ ] Tests: retry stops on success; gives up after 90 s; 401 redirects; error shape is parsed

**FE-0.4 Mock backend (MSW)**
Handlers for **every** endpoint in the contract, with the same paths, shapes and error codes. `mocks/db.ts` generates ~150 fake companies covering every step status, email status and AI status, plus a few duplicates, a running run and a paused run. Mutations change the in-memory data, so flows feel real. Filtering, sorting and paging work. 200–600 ms fake delay. `?mock_wake=1` makes the next 5 s return 503 to test the banner. `?mock_role=reviewer` logs in as a reviewer.
Needs: J-0.1, FE-0.3
- [ ] Every enum value is visible somewhere in the mock data
- [ ] Mock responses type-check against `api/types.ts`

**FE-0.5 App shell + auth**
Layout (sidebar with Overview, Runs, Companies, Review (with counts), Exports, Admin), header with user and logout, all routes with placeholder pages, `AuthProvider` (`/auth/me`), login page (react-hook-form + zod; shows the 429 message), `RequireAuth`, `RequireRole`, 404 page, `WakingBanner`, toasts.
Needs: FE-0.3, FE-0.4
- [ ] Logged out → any route goes to login, then back to where you were
- [ ] Reviewer can't see admin nav or reach admin routes

**FE-0.6 Shared components**
`DataTable` (server paging/sort, column visibility, row click), `FilterBar` (synced to URL, debounced search), `StatusBadge` (step / email / AI variants), `StepDots` (8 steps in a row, tooltip with reason), `SourceLink`, `EmptyState`, `ErrorState`, `Skeleton`, `ConfirmDialog`, `Drawer`, `DateTime` (relative time with exact time on hover), `PageHeader`.
Needs: FE-0.1
- [ ] Tests: filter ↔ URL round trip; StatusBadge covers every enum value
- [ ] All components work by keyboard

**J-0.1 Freeze the API contract** (joint, see below)

### Phase 1 — Exhibitors (Gate 1)

**FE-1.1 Overview**
Edition picker. Number cards: advertised (labelled "ADIPEC advertised — reference only"), discovered, unique, duplicates, contacts, companies with contacts, AI drafts, failures. Per-step stacked bars by status. Emails-by-status bar. Clicking a segment opens the company list with that filter.
Needs: FE-0.5, FE-0.6
- [ ] Advertised and discovered are always shown as separate numbers (PTC §1.2)

**FE-1.2 Runs**
List of runs. "Start run" dialog (admin): edition plus optional steps, with all selected by default. Run detail: status, progress per step (queued/done/failed), counts, pause/resume (admin), and an error list with links to companies. Polls every 5 s while running and stops polling when done or paused.
Needs: FE-0.5, FE-0.6
- [ ] Start → shows running → pause → paused → resume, all in mocks
- [ ] Starting while another run is active shows the 409 message clearly

**FE-1.3 Company list**
Columns: name, domain, country, category, stand, `StepDots`, contacts count, email summary, AI status, completeness, updated. Every filter from `CompanyFilters` is in the URL. Sort on name, updated and completeness. 50 per page. Row click opens the detail.
Needs: FE-0.6
- [ ] Filter, refresh the page: same results
- [ ] Empty filter result shows a "clear filters" action

**FE-1.4 Company detail — ADIPEC tab + steps panel**
Header: name, domain, completeness, duplicate banner (with a link to the other record). Steps panel: each step's status, reason and time. ADIPEC tab: one card per edition with all captured fields, profile link and captured date.
Needs: FE-1.3
- [ ] A company with missing fields shows "Not available" plus the reason, not blanks (AT-02)

### Phase 2 — Company research (Gate 2)

**FE-2.1 Website + Socials tabs**
Website: URL, summary, services, markets, generic contact details (with source), facts list (with source link and fact/inference badge), pages reviewed, skipped pages with reasons. Socials: each network with link or "Not found".
Needs: FE-1.4
- [ ] Every fact shows its source link (AT-03)

**FE-2.2 Editing + history**
Inline edit for website URL, summary, services, markets, socials, Sales Nav account URL and confidence, and leadership coverage (PATCH, optimistic update with rollback on error). A lock icon on human-edited fields (`lockedFields`). A step override control: pick a status, reason required. History tab: timeline of field, old value → new value, who and when.
Needs: FE-2.1
- [ ] After an edit, the history tab shows it straight away

**FE-2.3 Review queue — shell + website + duplicate**
`/review/:type` with tabs and counts from `/review/counts`. A list with reason and age; clicking a row opens a drawer.
- **Website tab:** set or fix the URL, or mark "no website" with a reason.
- **Duplicate tab:** side-by-side compare of both records, then "Merge into…" (confirm dialog) or "Not a duplicate".

Needs: FE-0.6, FE-2.2
- [ ] Resolving an item removes it from the list and updates the counts

### Phase 3 — People (Gate 3)

**FE-3.1 Contacts tab**
Table of contacts with emails (each with a status badge, provider and captured date). Add/edit form (react-hook-form + zod, same rules as `ContactInput`). Delete (admin, with confirm). The leadership coverage selector sits above the table.
Needs: FE-1.4
- [ ] Several contacts per company, no duplicates on re-save (AT-05)
- [ ] An email without a source can't be saved (AT-06)

**FE-3.2 Contact CSV paste import**
Textarea plus a "download template" link (header row only). Preview the first 10 rows, import, then show the result: created, updated, and a per-row error table.
Needs: FE-3.1
- [ ] A paste with bad rows imports the good ones and lists the bad ones

**FE-3.3 Sales Navigator review task**
Review tab `salesnav`, drawer per company:
1. Company facts summary and an **"Open Sales Navigator search"** button (new tab, link only).
2. Paste the account URL and pick a match confidence.
3. Add CXOs/decision-makers inline (same form as FE-3.1).
4. Set leadership coverage. Helper text: "Relationship Explorer shows a limited set. Only choose Reviewed after you've checked beyond it."
5. "Mark account and people done", which calls the steps endpoint for `account` and `people`.

Needs: FE-2.3, FE-3.1
- [ ] Nothing in the UI suggests the list of executives is complete unless coverage is Reviewed (FR-16)

**FE-3.4 Review tabs — contacts + emails**
`contacts`: companies with no contacts after review. Link to the Sales Nav task, or mark as "none found" with a reason.
`emails`: invalid, risky or pending emails. Edit, remove, or add manually with a source.
Needs: FE-2.3, FE-3.1
- [ ] Every action is visible in the history tab

### Phase 4 — AI + first CSV (Gate 5)

**FE-4.1 AI review screen**
`/ai/:companyId`, two panes.
- **Left — evidence:** facts with source links, services, ADIPEC description.
- **Right — company fields:** summary, signal (+ URL), hypothesis, hyper-personalization. Below that, one card per contact: subject, email draft, LinkedIn draft.
- **Each block:** status badge, edit + Save (new version), Approve, Reject (reason required), Regenerate (202 → "Generating…", poll until a new version appears). A version dropdown, and the approved copy shown separately with its date.
- **Guidance:** `insufficient_evidence` shows a warning explaining why. Soft character guides follow PTC §5.1 (summary 2–5 sentences, hyper-personalization 1–3).

Needs: FE-1.4
- [ ] Approve → regenerate → the approved copy is still shown unchanged (FR-30)
- [ ] Every signal shows a clickable source (AT-08)

**FE-4.2 AI in company detail + review tab**
An AI tab on the company page (read view plus an "Open AI review" button). The `ai` review tab lists insufficient-evidence and rejected drafts.
Needs: FE-4.1, FE-2.3

**FE-4.3 Exports page**
Pick the type (company / contact / outreach) and version (initial / final), reusing `FilterBar`. Live row count from `/count`. Download button: a plain link to `/api/exports/:kind.csv?...`, so the browser handles the file and the cookie is sent. Export history table from `/exports/log`.
Needs: FE-0.6
- [ ] The downloaded file opens in Excel with correct characters (mock serves a sample CSV)
- [ ] The row count matches what the list page shows for the same filters

### Phase 5 — Email check + final CSV (Gate 4)

**FE-5.1 Email statuses everywhere**
Email status filter on the company list and exports. Overview emails-by-status. Contact emails show status, checked date and source on hover.
Needs: FE-3.1, FE-1.1
- [ ] `not_checked` and `unknown` look different from `verified`, and the labels say why (FR-21)

**FE-5.2 Run verification (admin)**
"Check emails" button on the Exports page, enabled once an initial export exists in the log. Confirm dialog explaining which checker will be used (from `/settings/providers`). Shows progress via the run.
Needs: FE-4.3
- [ ] With no MillionVerifier, the dialog says checks will be MX-only and can't mark anything Verified

### Phase 6 — Hardening & delivery (Gate 6)

**FE-6.1 Admin screens**
Users (list, add, change role, reset password, delete with confirm). Providers (read-only on/off list with what "off" means for each step). Suppressions (list, add email/domain with reason, delete).
Needs: FE-0.5
- [ ] A reviewer gets 403-safe UI everywhere (hidden, not just disabled)

**FE-6.2 Gap report**
Summary numbers, per-step status table, and a blocked-records table (company, step, status, reason, with a link). Download CSV.
Needs: FE-0.6
- [ ] The numbers match the overview for the same edition

**FE-6.3 Quality pass**
Every screen has loading/empty/error states. Keyboard-only walkthrough of the main flows. axe check with no serious issues. Works from 1280 px wide. Long names and texts don't break the layout. Check in Chrome, Safari and Firefox.
- [ ] Checklist in the PR description ticked

**FE-6.4 E2E smoke tests**
Playwright on mocks, run in CI: login → company list filter → company detail → add contact → approve AI → export download → admin adds a user. Plus a reviewer run that checks admin pages are blocked.
- [ ] Runs in CI under 3 minutes

**FE-6.5 Reviewer guide**
`docs/user-guide.md`: how to start a run, work the review queue, do the Sales Nav task, review AI, export, and what each status means. Add screenshots once the UI is stable.
- [ ] Someone new can do the Sales Nav task using only this guide

---

## API contract

> **This section is identical in both repos.** It is the only thing either side depends on. Change it in both PLAN.md files in the same day, and follow the change rules below.

### Ground rules

- The browser calls `/api/...`. Vercel forwards that to Render and strips `/api`. Backend routes have **no** `/api` prefix.
- JSON everywhere except CSV downloads. Dates are ISO 8601 strings. IDs are strings.
- **Auth:** login sets an httpOnly cookie called `sid`. Every route needs it except `POST /auth/login`, `GET /health` and `POST /cron/*`.
- **Lists:** `?page=1&pageSize=50` returns `{ items, page, pageSize, total }`. Max `pageSize` is 200.
- **Errors:** always `{ "error": { "code": "...", "message": "...", "details": {...}? } }`.
  Codes: `bad_request` 400 · `unauthorized` 401 · `forbidden` 403 · `not_found` 404 · `conflict` 409 · `rate_limited` 429 · `internal` 500.
- **Slow actions** (start run, regenerate AI, verify emails) return `202 { "queued": true }`. The client then polls the related resource.
- **Missing data is explicit:** a field we couldn't get is left out, and the step status tells you why. Never use `""` or `"N/A"` to fill a gap.

### Change rules (so nobody gets blocked)

1. **Adding** a field or endpoint: backend just ships it and updates this section. Frontend picks it up whenever.
2. **Renaming or removing** something: don't. Add the new one and keep the old one until frontend has switched. Then remove it in a separate PR that both of you approve.
3. Whoever changes this section updates it in **both** repos.

### Types

```ts
// ---------- enums ----------
type StepKey = 'profile' | 'website' | 'social' | 'account' | 'people' | 'emails' | 'verification' | 'personalization';
type StepStatus = 'not_started' | 'in_progress' | 'completed' | 'partial' | 'needs_review'
                | 'pending_access' | 'restricted' | 'failed' | 'approved';
type EmailStatus = 'verified' | 'invalid' | 'risky' | 'unknown' | 'not_checked';
type AiStatus = 'pending' | 'insufficient_evidence' | 'draft' | 'approved' | 'rejected';
type Coverage = 'confirmed_partial' | 'unknown' | 'reviewed';
type Confidence = 'high' | 'medium' | 'low';
type Role = 'admin' | 'reviewer';
type ReviewType = 'website' | 'duplicate' | 'salesnav' | 'contacts' | 'emails' | 'ai';
type ExportKind = 'companies' | 'contacts' | 'outreach';

// ---------- shared ----------
type Paged<T> = { items: T[]; page: number; pageSize: number; total: number };
type StepState = { status: StepStatus; reason?: string; updatedAt?: string };
type Fact = { text: string; sourceUrl: string; kind: 'fact' | 'inference' };

// ---------- users ----------
type User = { id: string; email: string; role: Role; createdAt: string };

// ---------- events ----------
type Event = { id: string; edition: number; name: string; directoryUrl: string; advertisedCount?: number };

// ---------- companies ----------
type Edition = {
  edition: number; profileUrl: string; stand?: string; category?: string; country?: string;
  description?: string; extra?: Record<string, string>; capturedAt: string;
};

type CompanyListItem = {
  id: string; name: string; domain?: string; country?: string; category?: string; stand?: string;
  editions: number[];
  stages: Record<StepKey, StepState>;
  contactsCount: number;
  emailsByStatus: Partial<Record<EmailStatus, number>>;
  aiStatus: AiStatus;
  duplicateOf?: string;
  completeness: number;            // 0–100
  updatedAt: string;
};

type Company = Omit<CompanyListItem, 'editions'> & {
  originalNames: string[];
  editions: Edition[];
  website: {
    url?: string; summary?: string; services: string[]; markets: string[];
    contactDetails: { emails: string[]; phones: string[]; addresses: string[]; sourceUrl?: string };
    pagesReviewed: { url: string; fetchedAt: string }[];
    skipped: { url: string; reason: string }[];
    facts: Fact[];
  };
  socials: { linkedin?: string; facebook?: string; instagram?: string; x?: string; youtube?: string; other: string[] };
  salesNav: { accountUrl?: string; matchConfidence?: Confidence; searchUrl: string };
  leadershipCoverage: Coverage;
  lockedFields: string[];          // fields a human edited; workers won't overwrite them
  ai: CompanyAi;
  contacts: Contact[];
};

type CompanyFilters = {
  q?: string; edition?: number; category?: string; country?: string;
  step?: StepKey; stepStatus?: StepStatus;
  hasContacts?: boolean; emailStatus?: EmailStatus; aiStatus?: AiStatus; duplicate?: boolean;
  sort?: 'name' | '-name' | 'updatedAt' | '-updatedAt' | 'completeness' | '-completeness';
};

// ---------- contacts ----------
type Email = {
  address: string; type?: 'business' | 'generic'; provider?: string; capturedAt: string;
  verification: { status: EmailStatus; checkedAt?: string; source?: string };
};

type Contact = {
  id: string; companyId: string; firstName: string; lastName: string;
  title?: string; seniority?: string; profileUrl?: string; geography?: string;
  matchConfidence?: Confidence; source: string;  // 'manual' | 'csv_import' | 'contactout' | ...
  emails: Email[]; ai: ContactAi; createdAt: string; updatedAt: string;
};

type ContactInput = {
  firstName: string; lastName: string; title?: string; seniority?: string; profileUrl?: string;
  geography?: string; matchConfidence?: Confidence; source: string;
  emails?: { address: string; type?: 'business' | 'generic'; provider?: string }[];
};

// ---------- AI ----------
type AiVersion = { fields: Record<string, string>; by: string; at: string };

type CompanyAi = {
  status: AiStatus; reason?: string;
  summary?: string; signal?: string; signalUrl?: string; hypothesis?: string;
  hyperPersonalization?: string; evidenceUrls: string[];
  approved?: AiVersion;            // last approved copy; exports prefer this
  versions: AiVersion[];           // newest first
};

type ContactAi = {
  status: AiStatus; reason?: string;
  subject?: string; draft?: string; linkedinDraft?: string; evidenceUrls: string[];
  approved?: AiVersion; versions: AiVersion[];
};

// ---------- runs ----------
type Run = {
  id: string; edition: number; status: 'running' | 'paused' | 'completed' | 'failed';
  steps: (StepKey | 'directory')[]; startedBy: string; createdAt: string; finishedAt?: string;
  counts: { discovered: number; attempted: number; completed: number; partial: number;
            restricted: number; failed: number; duplicate: number };
  perStep: Record<string, { queued: number; done: number; failed: number }>;
  errors: { companyId?: string; companyName?: string; step: string; message: string; at: string }[]; // last 100
};

// ---------- review / reports ----------
type ReviewItem = { type: ReviewType; companyId: string; companyName: string;
                    contactId?: string; contactName?: string; reason: string; since: string };

type Overview = {
  edition: number; advertised?: number; discovered: number; unique: number; duplicates: number;
  byStep: Record<StepKey, Partial<Record<StepStatus, number>>>;
  contacts: number; companiesWithContacts: number;
  emailsByStatus: Record<EmailStatus, number>; ai: Record<AiStatus, number>; failures: number;
};

type GapReport = {
  edition: number; generatedAt: string; advertised?: number; discovered: number; researched: number;
  contactsFound: number; emailsChecked: number; aiDone: number;
  byStep: Record<StepKey, Partial<Record<StepStatus, number>>>;
  blocked: { companyId: string; companyName: string; step: StepKey; status: StepStatus; reason?: string }[];
};

type HistoryEntry = { field: string; before: unknown; after: unknown; by: string; at: string };
type ExportLogEntry = { id: string; kind: ExportKind; version: 'initial' | 'final';
                        filters: CompanyFilters; rows: number; by: string; at: string };
type Providers = { contactout: boolean; millionverifier: boolean; llm: boolean; llmModel?: string };
type Suppression = { id: string; value: string; reason?: string; at: string };
```

### Endpoints

`user` = any logged-in user. `admin` = admin only.

| Method | Path | Who | Send | Get back |
|---|---|---|---|---|
| **Auth** |||||
| POST | `/auth/login` | anyone | `{ email, password }` | `User` + sets cookie |
| POST | `/auth/logout` | user | – | 204 |
| GET | `/auth/me` | user | – | `User` |
| **Users** |||||
| GET | `/users` | admin | – | `User[]` |
| POST | `/users` | admin | `{ email, password, role }` | `User` |
| PATCH | `/users/:id` | admin | `{ role?, password? }` | `User` |
| DELETE | `/users/:id` | admin | – | 204 |
| **Events & overview** |||||
| GET | `/events` | user | – | `Event[]` |
| POST | `/events` | admin | `{ edition, name, directoryUrl, advertisedCount? }` | `Event` |
| GET | `/stats/overview` | user | `?edition` | `Overview` |
| **Runs** |||||
| GET | `/runs` | user | `?page` | `Paged<Run>` |
| POST | `/runs` | admin | `{ edition, steps? }` (no steps = everything) | 202 `Run` |
| GET | `/runs/:id` | user | – | `Run` |
| POST | `/runs/:id/pause` | admin | – | `Run` |
| POST | `/runs/:id/resume` | admin | – | `Run` |
| **Companies** |||||
| GET | `/companies` | user | `CompanyFilters` + `page`, `pageSize` | `Paged<CompanyListItem>` |
| GET | `/companies/:id` | user | – | `Company` |
| PATCH | `/companies/:id` | user | any of `website.url`, `website.summary`, `website.services`, `website.markets`, `socials.*`, `salesNav.accountUrl`, `salesNav.matchConfidence`, `leadershipCoverage` | `Company` |
| POST | `/companies/:id/steps/:step` | user | `{ status, reason }` | `Company` |
| POST | `/companies/:id/merge` | user | `{ intoId }` | `Company` (the one kept) |
| POST | `/companies/:id/not-duplicate` | user | – | `Company` |
| GET | `/companies/:id/history` | user | – | `HistoryEntry[]` |
| DELETE | `/companies/:id` | admin | – | 204 (also deletes its contacts) |
| **Contacts** |||||
| POST | `/companies/:id/contacts` | user | `ContactInput` | `Contact` |
| POST | `/companies/:id/contacts/import` | user | `{ csv }` (columns: first_name,last_name,title,seniority,profile_url,geography,email) | `{ created, updated, errors: { row, message }[] }` |
| PATCH | `/contacts/:id` | user | `Partial<ContactInput>` | `Contact` |
| DELETE | `/contacts/:id` | admin | – | 204 |
| **Review queue** |||||
| GET | `/review/counts` | user | – | `Record<ReviewType, number>` |
| GET | `/review` | user | `?type&page` | `Paged<ReviewItem>` |
| **AI** |||||
| POST | `/companies/:id/ai/regenerate` | user | – | 202 |
| PATCH | `/companies/:id/ai` | user | `{ action: 'save' \| 'approve' \| 'reject', fields?, reason? }` | `CompanyAi` |
| POST | `/contacts/:id/ai/regenerate` | user | – | 202 |
| PATCH | `/contacts/:id/ai` | user | same as company | `ContactAi` |
| **Exports** |||||
| GET | `/exports/:kind/count` | user | `CompanyFilters` | `{ rows }` |
| GET | `/exports/:kind.csv` | user | `CompanyFilters` + `version=initial\|final` | CSV file download |
| GET | `/exports/log` | user | `?page` | `Paged<ExportLogEntry>` |
| **Email verification** |||||
| POST | `/verification/run` | admin | `{ edition }` | 202 |
| **Reports & settings** |||||
| GET | `/reports/gap` | user | `?edition` | `GapReport` |
| GET | `/reports/gap.csv` | user | `?edition` | CSV |
| GET | `/settings/providers` | user | – | `Providers` |
| GET | `/suppressions` | admin | – | `Suppression[]` |
| POST | `/suppressions` | admin | `{ value, reason? }` (email or domain) | `Suppression` |
| DELETE | `/suppressions/:id` | admin | – | 204 |
| **System** |||||
| GET | `/health` | anyone | – | `{ ok, mongo, redis, workers }` |
| POST | `/cron/:task` | GitHub Actions (`x-cron-secret` header) | – | 202 |

---

## Joint tickets

These are the only tickets that need both of you. None of them stops either person from moving on.

**J-0.1 Freeze the API contract**
Both read the contract section, push back on anything unclear, and agree on it. After that, frontend builds mocks from it and backend builds routes to it.
- [ ] Both have approved the contract PR in both repos

**J-1 … J-6 Integration check (one per phase)**
Once both sides of a phase are merged, run the frontend with `VITE_API_MOCK=false` against the backend, either locally or on Render. Click through that phase's screens. Whichever side differs from the contract fixes it. The next phase can start before this is done.
- [ ] Every screen in the phase works on real data
- [ ] Mismatches are fixed or logged as issues
- [ ] That phase's acceptance tests pass end to end

## Working agreements

- **One ticket = one branch = one PR.** Name branches like `be-1.4-directory` or `fe-2.3-review-queue`. Put the ticket ID in the PR title.
- **`main` is protected.** CI must pass. Squash merge. Self-merge is fine; tag the other person on anything that touches the contract.
- **Turn tickets into GitHub Issues** with the same IDs. Track them on one GitHub Project board with the columns Todo / Doing / Review / Done.
- **Definition of done for every ticket:** its acceptance checklist is ticked, CI is green, logic has tests, docs/README are updated where relevant, and nothing secret or personal is committed.
- **The repos are public.** Never commit `.env` files, real contact data, CSV exports, database dumps or API keys. Test fixtures use fake names and `example.com`.

## Decisions we still need

1. Which paid tools do we **already** have and are allowed to use? Sales Navigator seat, ContactOut (API or only the browser extension?), MillionVerifier credits, an AI API key.
2. Has ADIPEC's exhibitor list been confirmed OK to collect automatically? Gate 1 needs this.
3. Is Vercel Hobby OK for an internal company tool? If not, the frontend goes on a Render Static Site. Same build, no code change.
4. If an AI free tier (Gemini / Groq) is used, does the admin approve sending contact names and titles to it? Free tiers may train on inputs.

Until these are answered, the matching steps run in "Pending Access" mode, so nothing waits on them.
