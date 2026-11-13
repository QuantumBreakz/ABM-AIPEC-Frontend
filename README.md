# ADIPEC Lead Gen — Frontend

The web app for the ADIPEC automated lead-generation system (Smart Logics). It lets staff start
research runs, review companies and contacts, approve AI-written outreach drafts, and export CSVs.
The backend lives in a separate repo: [ABM-AIPEC-Backend](https://github.com/QuantumBreakz/ABM-AIPEC-Backend).

- Plan, tickets and the API contract: [PLAN.md](PLAN.md)
- How and in what order we build it: [FRONTEND-DEV-PLAN.md](FRONTEND-DEV-PLAN.md)

## Rules the UI follows

- **Never hide missing data.** Unknown values show "Not available" plus the reason, never a blank.
- **Every fact links to its source.** Facts that are guesses are labelled "Inference".
- **Contrast is measured, not guessed.** Text is at least 4.5:1 (most is 6:1 or more), control
  outlines and chart fills at least 3:1, in light and dark. `src/test/contrast.test.ts` checks the
  real colour tokens in `src/index.css` and fails if a colour drops below its bar.
- **Statuses are never colour-only.** Every badge has an icon and a text label.
- **Emails are never "Verified" without a recorded check.** `Not checked` and `Unknown` look different.
- **No automation on LinkedIn or Sales Navigator.** A person does that part; the app only links out.
- **No automatic email sending.** The app produces drafts only.

## Status

Progress against the tickets in PLAN.md. Updated with each merged PR.

| Phase | Ticket                      | Status      |
| ----- | --------------------------- | ----------- |
| 0     | FE-0.1 Project setup        | Done        |
| 0     | FE-0.3 API client           | Done        |
| 0     | FE-0.6 Shared components    | Done        |
| 0     | FE-0.4 Mock backend (MSW)   | Done        |
| 0     | FE-0.5 App shell + auth     | Done        |
| 0     | FE-0.2 Vercel deploy        | Next        |
| 1     | FE-1.3 Company list         | Done        |
| 1     | FE-1.1 Overview             | Done        |
| 1     | FE-1.2 Runs                 | Done        |
| 1     | FE-1.4 Company detail       | Done        |
| 2     | FE-2.1 Website + Socials    | Done        |
| 2     | FE-2.2 Editing + History    | Done        |
| 2     | FE-2.3 Review queue         | Done        |
| 3     | FE-3.1 Contacts             | In review   |
| 3     | FE-3.2 CSV paste import     | Next        |
| 3     | FE-3.3 Sales Nav task       | Not started |
| 3     | FE-3.4 Review: contacts, emails | Not started |
| 4     | AI review, first CSV        | Not started |
| 5     | Email check, final CSV      | Not started |
| 6     | Hardening and delivery      | Not started |

## What exists today

- **API client** (`src/api/client.ts`): one place for all HTTP calls. Sends the login cookie,
  turns errors into `ApiError`, redirects to login on 401, and retries for up to 90 s while the
  free-tier backend wakes up (`useWaking()` drives the banner).
- **Contract types** (`src/api/types.ts`): copied from the API contract in PLAN.md.
- **Design system** (`src/index.css`): Inter + JetBrains Mono, an indigo accent, status colours,
  light and dark themes, all as tokens in one file.
- **Shared components** (`src/components/`): `StatusBadge`, `StepDots`, `SourceLink`,
  `NotAvailable`, `DateTime`, `DataTable`, `FilterBar`, `EmptyState`, `ErrorState`, `Skeleton`,
  `ConfirmDialog`, `Drawer`, `PageHeader`, plus `ui/` basics (`Button`, `Input`, `Select`, `Tooltip`).
- **URL-synced filters** (`src/lib/useUrlFilters.ts`): filters, page and sort live in the URL.
- **Mock backend** (`src/mocks`): a fake server (MSW) that answers every endpoint of the API
  contract with ~150 generated companies covering every status. See "Mock backend" below.
- **App shell and sign-in** (`src/routes.tsx`, `src/auth`, `src/components/layout`): login page,
  sidebar with a review-count badge, top bar with theme toggle and account menu, route guards
  (signed out goes to login and back; reviewers cannot open admin pages), 404 page and the "server
  is waking up" banner. Screens that later tickets build are placeholders for now.
- **Overview** (`/`): headline numbers (the advertised ADIPEC count is shown apart, as reference
  only), progress per step as stacked bars, and emails by status as one split bar. Every bar and
  number links to the matching company list. A Chart/Table switch shows the same data as a table.
- **Runs** (`/runs`, `/runs/:id`): the list of runs with status and progress; an admin can start a
  run (edition plus which steps, all ticked by default) and pause or resume it. A run page shows
  progress per step, counts and the errors with links to the companies. Pages that show a running
  run refresh every 5 seconds and stop when it is paused or finished. Starting while another run is
  active shows the server's explanation and a link to that run.
- **Company detail** (`/companies/:id`): name, website and edition(s), research completeness, a
  duplicate warning that links to the other record, a Steps panel (status, full reason and time for
  each of the 8 steps) and tabs (ADIPEC, Website, Socials, Contacts, AI, History) that each have
  their own address. The ADIPEC tab has one card per edition with every published field; missing
  fields read "Not available" with the reason. The other tabs fill in over the next tickets.
- **Website and Socials tabs**: what the official website says (summary, services, markets, contact
  details with where they were found), a list of facts where every fact links to its source page and
  guesses are labelled "Inference", the pages reviewed and the pages skipped with reasons, and each
  social network as a link or "Not found". When most of a card is empty for one reason, the reason is
  stated once at the top.
- **Editing and history**: the website address, summary, services, markets and social links can be
  edited in place (pencil button, Enter to save, Escape to cancel). The screen changes at once and
  the old value comes back with a message if the server refuses. A lock marks fields a person has
  edited, so automatic updates will not overwrite them. Anyone can set a step's status by hand (a
  reason is required). The Contacts tab holds the Sales Navigator account, match confidence and
  leadership coverage (never shown as complete unless a person reviewed it). The History tab lists
  every change with before, after, who and when.
- **Review queue** (`/review/:type`): six tabs (Website, Duplicates, Sales Navigator, Contacts,
  Emails, AI drafts) with how many items wait in each. Each row says why it is there and how long it
  has waited; clicking it opens a drawer whose address can be shared. For websites you set the right
  address or mark "no website" with a reason. For duplicates you compare both records side by side,
  then merge (with a confirmation, choosing which to keep) or mark them as different. Resolved items
  leave the list and the counts and sidebar badge go down. The other tabs link to the company page
  until their guided drawers arrive.
- **Company list** (`/companies`): search, filters (edition dropdown, country, step status, email
  and AI status, duplicates…), sortable headings, 50 per page, show/hide columns, all kept in the
  URL. Missing data reads "Not available"; there are loading, empty and error states.
- **Component gallery** (`src/pages/DevGallery.tsx`): every component on one page, at `/dev/ui` in
  development builds only.

## Stack

| Need         | Choice                                    |
| ------------ | ----------------------------------------- |
| Build        | Vite + React 19 + TypeScript (strict)     |
| Routing      | React Router                              |
| Server data  | TanStack Query                            |
| Tables       | TanStack Table v8                         |
| Styling / UI | Tailwind CSS v4, Radix UI primitives      |
| Forms        | react-hook-form + zod                     |
| Mock backend | MSW (Mock Service Worker)                 |
| Tests        | Vitest + Testing Library (Playwright later) |
| Lint, format | ESLint + Prettier                         |
| Hosting      | Vercel                                    |

## Getting started

Needs Node 22 or newer.

```bash
npm i
npm run dev          # http://localhost:5173, mock backend on by default
```

| Command             | What it does                                  |
| ------------------- | --------------------------------------------- |
| `npm run dev`       | Dev server with hot reload                    |
| `npm test`          | Unit and component tests (once)               |
| `npm run test:watch`| Tests in watch mode                           |
| `npm run lint`      | ESLint and Prettier check (what CI runs)      |
| `npm run format`    | Fix formatting and auto-fixable lint issues   |
| `npm run typecheck` | TypeScript check                              |
| `npm run build`     | Production build into `dist/`                 |

### Environment variables

| Name             | Value                                                                |
| ---------------- | -------------------------------------------------------------------- |
| `VITE_API_MOCK`  | `true` uses fake data (default in dev). `false` talks to the backend. |
| `VITE_API_BASE`  | API path prefix, `/api` by default.                                  |

Vite env values are baked in at build time. To use the real backend locally, run it on port 4000
and set `VITE_API_MOCK=false`; Vite forwards `/api/*` to `http://localhost:4000` (the same job the
Vercel rewrite does in production).

## Mock backend

With `VITE_API_MOCK=true` (the default in dev) every `/api` call is answered in the browser by
`src/mocks`, so screens can be built and demoed with no backend. Data lives in memory and resets
on refresh. Sign in with `admin@example.com` or `reviewer@example.com`, password `password`.

Add these to the page URL to test situations:

| Switch                   | Effect                                                         |
| ------------------------ | -------------------------------------------------------------- |
| `?mock_role=reviewer`    | Signs you in as a reviewer (or `admin`) without the login form |
| `?mock_wake=1`           | Server answers 503 for 5 s, to see the "waking up" banner      |
| `?mock_fail=/companies`  | Forces a 500 on matching paths, to see error states            |

Behaviour worth knowing: runs advance every time they are read (so polling shows progress), AI
"Regenerate" finishes after ~2.5 s, the review queue is worked out from the data (resolving an item
removes it), and CSV exports have an "initial" version (all emails Not Checked) and a "final" one.

## Troubleshooting

- **"useAuth must be used inside AuthProvider" in the browser (Windows).** Vite can load files twice
  when the folder path differs in drive-letter case (`c:` vs `C:`). `vite.config.ts` already uses
  the canonical path for the root and the `@/` alias; keep it that way.

## Project layout

```
src/
  main.tsx, App.tsx     entry point; routes.tsx lists every route
  index.css             design tokens (colours, fonts, themes)
  api/                  client.ts, types.ts, queryClient.ts, waking.ts, queries/
  mocks/                fake backend (MSW): seed data, handlers, tests
  auth/                 sign-in state (AuthProvider, useMe) and route guards
  components/           shared UI pieces; ui/ holds the basics
  pages/                one component per screen
  lib/                  helpers: status maps, formatting, URL filters
  test/                 test setup
e2e/                    Playwright tests, added in FE-6.4
```

## How we work

- One ticket is one branch (`fe-0.6-shared-components`) and one PR, with the ticket ID in the title.
- `main` is protected: CI (lint, typecheck, test, build) must pass. Squash merge.
- Every ticket needs tests for its logic and the four states (loading, empty, error, data) on screens.
- **The repo is public.** Never commit `.env` files, real contact data, CSV exports, database
  dumps or API keys. Test data uses fake names and `example.com`.
