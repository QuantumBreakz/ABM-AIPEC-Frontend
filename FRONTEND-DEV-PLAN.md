# Frontend Development Plan

Companion to [PLAN.md](PLAN.md). PLAN.md says **what** to build (tickets, contract, screens). This file says **how and in what order** to build it. If the two disagree, PLAN.md and the API contract win.

Scope: this repo only (`ABM-AIPEC-Frontend`, Vite + React 19 + TS, hosted on Vercel Hobby). Backend is a separate repo; we depend only on the frozen contract and work against MSW mocks until it is live.

---

## 1. Principles

1. **Contract first, mocks second, screens third.** No screen is built against a guessed shape.
2. **Vertical slices.** Each ticket ships a usable screen end to end (route, query hook, mock handler, states, test), not a layer.
3. **Honest UI.** Missing data, restricted steps and unverified emails must look different from success (PTC §1.2, FR-19, FR-21).
4. **Manual Sales Navigator.** Nothing in the frontend calls, embeds or scrapes LinkedIn / Sales Nav. We only open a link in a new tab and record what the reviewer types.
5. **Server is the source of truth.** No client copy of business state beyond TanStack Query cache and URL params.
6. **No secrets, no real data in the repo.** Public repo. Fixtures use fake names and `example.com`.

---

## 2. Build order (critical path)

```
FE-0.1 setup ─┬─ FE-0.2 Vercel
              ├─ FE-0.3 API client ─┬─ FE-0.4 MSW mocks (needs J-0.1) ─ FE-0.5 shell+auth
              └─ FE-0.6 shared components ───────────────────────────────┤
                                                                         ▼
 Phase 1: FE-1.1 Overview · FE-1.2 Runs · FE-1.3 Company list → FE-1.4 Company detail
 Phase 2: FE-2.1 Website/Socials → FE-2.2 Editing/History → FE-2.3 Review queue (website, duplicate)
 Phase 3: FE-3.1 Contacts → FE-3.2 CSV paste · FE-3.3 Sales Nav task · FE-3.4 Review (contacts, emails)
 Phase 4: FE-4.1 AI review → FE-4.2 AI tab · FE-4.3 Exports
 Phase 5: FE-5.1 Email statuses · FE-5.2 Run verification
 Phase 6: FE-6.1 Admin · FE-6.2 Gap report · FE-6.3 Quality · FE-6.4 E2E · FE-6.5 Guide
```

Parallelisable once Phase 0 is done: FE-1.1, FE-1.2, FE-1.3 are independent; FE-4.3 (Exports) and FE-6.1/6.2 only need shared components and can be pulled forward if blocked elsewhere.

### Suggested sequencing (solo, ~6 weeks; adjust to your pace)

| Week | Focus                                                                  | Exit check                                                                                  |
| ---- | ---------------------------------------------------------------------- | ------------------------------------------------------------------------------------------- |
| 1    | Phase 0 complete (setup, Vercel, client, mocks, shell, components)     | Logged-in empty shell on a Vercel preview, all routes reachable, mocks serve every endpoint |
| 2    | Phase 1 (Overview, Runs, Company list, Detail shell)                   | Gate 1 demo: counts, runs, company list with `StepDots`                                     |
| 3    | Phase 2 (research tabs, editing, history, review queue)                | Gate 2 demo: facts with sources, duplicate merge                                            |
| 4    | Phase 3 (contacts, CSV import, Sales Nav task, review tabs)            | Gate 3 demo: manual people workflow, honest coverage labels                                 |
| 5    | Phase 4 + 5 (AI review, exports, email statuses, verification trigger) | Gates 5 and 4 demo: approve a draft, download initial/final CSV                             |
| 6    | Phase 6 (admin, gap report, a11y/quality, e2e, guide)                  | Gate 6: full AT-01…12 click-through, CI green                                               |

Integration checks J-1…J-6 happen at the end of each phase when the backend side is ready. They never block the next phase.

---

## 3. Architecture decisions

### 3.1 Data layer

- One file per resource in `src/api/queries/` exporting hooks: `useCompanies(filters)`, `useCompany(id)`, `useUpdateCompany()`, `useContacts…`, `useRuns()`, `useOverview(edition)`, etc.
- **Query keys** are arrays from a single `keys.ts`: `['companies', filters]`, `['company', id]`, `['runs']`, `['review', type, page]`, `['review-counts']`. Mutations invalidate by these keys only.
- **Polling:** `refetchInterval` returns `5000` while `run.status === 'running'`, else `false`. AI regenerate polls until `versions[0].at` changes.
- **Optimistic updates** only for inline field edits (PATCH company). Everything else waits for the server and shows a pending state.
- Cache: `staleTime` 30 s for lists, 0 for detail pages being edited.

### 3.2 Errors

- `ApiError { status, code, message, details }` is the only error type components see.
- Mapping: 401 → login redirect; 403 → "You don't have access" state; 404 → NotFound state in-page; 409 → inline message with the server's text; 429 → "Too many attempts" on login; 5xx / network → `ErrorState` with retry.
- Waking-backend retry (90 s, banner) applies to all calls except login submits (those show the error directly after the first failure window).

### 3.3 URL state

- Filters, page, sort, selected tab and drawer item live in the URL (`useSearchParams`). Helpers in `lib/filters.ts` convert `CompanyFilters` ⇄ query string, with tested round trips.
- Never store filters in React state alone.

### 3.4 Auth and roles

- `AuthProvider` loads `/auth/me` once; `useMe()` returns `{ user, isAdmin }`.
- `RequireAuth` wraps everything except `/login`; `RequireRole role="admin"` wraps admin routes.
- Admin-only buttons are **not rendered** for reviewers (not just disabled). The backend still enforces.
- Cookie is httpOnly, so JS never sees it. All fetches use `credentials: 'include'`.

### 3.5 Components (build once, reuse everywhere)

| Component                 | Notes                                                                                                                  |
| ------------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| `StatusBadge`             | Variants: `step`, `email`, `ai`. Always text + colour + icon. Exhaustive `switch` so a new enum value fails typecheck. |
| `StepDots`                | 8 dots, fixed order from `StepKey`, tooltip shows status + reason + time.                                              |
| `SourceLink`              | New tab, `rel="noopener noreferrer"`, shows hostname, tooltip with full URL.                                           |
| `FactItem`                | Text + `SourceLink` + "Inference" badge when `kind === 'inference'`.                                                   |
| `DataTable`               | Server paging/sort, column visibility, row click, keyboard row focus.                                                  |
| `FilterBar`               | URL-synced, debounced search (300 ms), "Clear filters" action.                                                         |
| `NotAvailable`            | Renders "Not available" + step reason. Used instead of empty cells.                                                    |
| `Drawer`, `ConfirmDialog` | Radix; focus trap and Esc handled by library.                                                                          |
| `LockedFieldIcon`         | Shown on fields in `lockedFields`, tooltip explains workers won't overwrite.                                           |
| `WakingBanner`            | Global, driven by the API client's retry state.                                                                        |

### 3.6 Forms

- react-hook-form + zod. Schemas live next to the form and mirror contract types (`ContactInput`, step override, suppression, user).
- Server `details` errors map back onto fields where possible.

---

## 4. Mock backend plan (MSW)

- Handlers mirror every contract endpoint: same path (no `/api` prefix inside handlers, add it in the base), shapes, error codes and `Paged<T>` format.
- `db.ts` generates ~150 companies deterministically (seeded RNG) so tests are stable. Must cover:
  - every `StepStatus` on every `StepKey`, every `EmailStatus`, every `AiStatus`, every `Coverage`
  - companies with: no website, no contacts, many contacts, multiple editions, duplicates (`duplicateOf`), locked fields, insufficient-evidence AI, rejected AI, approved AI with a newer unapproved version
  - one running run, one paused, one completed, one failed with errors
- Mutations edit the in-memory store; list endpoints re-filter and re-sort, so flows behave like the real thing.
- Dev switches: `?mock_wake=1`, `?mock_role=reviewer`, plus `?mock_fail=<path>` to force a 500 on one endpoint (add this; useful for testing ErrorState).
- Type check: a test asserts every mock response satisfies the types in `api/types.ts`.

---

## 5. Screen-by-screen build notes

Each item adds detail to the matching PLAN.md ticket.

### Overview (FE-1.1)

- Edition select drives everything via `?edition=`.
- Cards: advertised (labelled reference only), discovered, unique, duplicates, contacts, companies with contacts, AI drafts, failures. Never compute "advertised − discovered" or imply a shortfall.
- Charts: stacked horizontal bars per step. Use text labels and counts; colours per UI rules. Segment click → `/companies?step=…&stepStatus=…&edition=…`.

### Runs (FE-1.2)

- Table + detail. Start dialog (admin) with step checkboxes; 409 shows "A run is already active" with a link to it.
- Run detail: per-step progress (`done / (queued+done+failed)`), counts block, error list (last 100) linking to companies. Derive "completion %" from `perStep`.

### Company list (FE-1.3)

- Columns per PLAN.md. Hide secondary columns on narrow widths via column visibility.
- Filter UI: search, edition, category, country, step + status, has contacts, email status, AI status, duplicate. (Completeness and approval filters need contract additions, see §9.)

### Company detail (FE-1.4, 2.1, 2.2, 3.1, 4.2)

- Header + steps panel persistent above tabs. Tabs are routes (`/companies/:id/website`) so deep links work.
- Tabs: ADIPEC · Website · Socials · Contacts · AI · History.
- Editing: click-to-edit fields with Save/Cancel; lock icon after human edit; step override control requires a reason.

### Review queue (FE-2.3, 3.3, 3.4, 4.2)

- Left: type tabs with counts; right: list; row opens a `Drawer` (`?item=companyId`).
- Resolving removes the row, decrements counts (invalidate `review-counts`).
- Sales Nav drawer is a numbered checklist, not a free form, so the manual steps are followed in order. The coverage helper text is mandatory copy (FR-16).

### AI review (FE-4.1)

- Two panes; each editable block has: status, version dropdown, Save (new version), Approve, Reject (reason), Regenerate.
- The approved copy is a separate read-only card with its timestamp. Editing never modifies it.
- `insufficient_evidence` and `pending` show an explanatory warning and **no** generic fallback text (FR-27, FR-31).
- Soft length hints only; never block saving.

### Exports (FE-4.3, 5.2)

- Kind (companies / contacts / outreach) × version (initial / final). Filters reuse `FilterBar`. Count from `/exports/:kind/count`.
- Download = `<a href>` to the CSV endpoint (browser handles the file and the cookie).
- "Check emails" (admin): enabled only when an initial export exists; confirm dialog states which checker is active (`/settings/providers`). If MillionVerifier is off, say checks are MX-only and cannot produce Verified.

### Admin + Gap report (FE-6.1, 6.2)

- Users, Providers (read-only, each row explains what "off" means), Suppressions, Gap report (numbers must equal Overview for the same edition; test that).

---

## 6. Testing strategy

| Layer       | Tool                                      | What we cover                                                                                                       |
| ----------- | ----------------------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| Unit        | Vitest                                    | `lib/filters` round trip, API client retry/401/error parsing, status → label/colour mapping, zod schemas            |
| Component   | Vitest + Testing Library (with MSW)       | `StatusBadge` all enum values, `StepDots`, `FilterBar` URL sync, forms (valid/invalid), AI block actions            |
| E2E smoke   | Playwright (on mocks, in CI, <3 min)      | login → filter → detail → add contact → approve AI → export download → admin adds user; reviewer blocked from admin |
| A11y        | axe via Playwright + manual keyboard pass | No serious/critical violations on main screens                                                                      |
| Integration | Manual per phase (J-1…J-6)                | Run with `VITE_API_MOCK=false` against backend                                                                      |

Rules: every ticket adds tests for logic it introduces; every bug fix adds a regression test.

---

## 7. CI/CD and environments

| Env               | Mock                             | Backend                          | Notes                                            |
| ----------------- | -------------------------------- | -------------------------------- | ------------------------------------------------ |
| Local dev         | on by default                    | optional via proxy to `:4000`    | `.env.development`                               |
| Vercel Preview    | on                               | none                             | Every PR clickable                               |
| Vercel Production | on until backend ready, then off | Render via `vercel.json` rewrite | Env vars baked at build; redeploy after changing |

- `ci.yml`: install → ESLint + Prettier → `tsc --noEmit` → Vitest → build. Playwright job added in FE-6.4.
- Branch protection on `main`; squash merge; one ticket = one branch = one PR; ticket ID in title.
- Before flipping production to `VITE_API_MOCK=false`: confirm `/health`, login works through the rewrite, and a smoke click-through passes.

---

## 8. Definition of done (per ticket)

- [ ] Acceptance checklist in PLAN.md ticked
- [ ] Loading, empty, error and data states all implemented
- [ ] Works by keyboard, labels on inputs, visible focus
- [ ] Mock handler updated (if endpoints touched) and type-checked
- [ ] Tests added and passing; CI green
- [ ] Missing/unknown data shown via `NotAvailable`, never blank
- [ ] Every fact has a `SourceLink` or an explicit "no source" state
- [ ] No secrets or real contact data committed
- [ ] README / user guide updated if behaviour changed

---

## 9. Open decisions that affect the frontend

1. Which providers are on (ContactOut, MillionVerifier, LLM)? Drives copy in Providers screen and the verification dialog; UI reads `/settings/providers` so no code change either way.
2. ADIPEC collection permission (Gate 1). Backend concern, but the Overview must show "Restricted" counts honestly if answer is partial.
3. Contract additions in §9: yes/no per row.
4. Vercel account type (Hobby vs team). **Decided: use Vercel.**
