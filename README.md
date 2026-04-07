# ParaShift — Frontend

[![Build](https://img.shields.io/badge/build-passing-brightgreen)](#)
[![Coverage](https://img.shields.io/badge/coverage-80%25-yellowgreen)](#)
[![License](https://img.shields.io/badge/license-MIT-blue)](#)

> Workforce scheduling, reimagined. AI-assisted planning, real-time rule enforcement, and a self-service experience for every role.

---

## Table of Contents

- [Executive Overview](#executive-overview)
- [Product Positioning](#product-positioning)
- [Core User Flow](#core-user-flow)
- [Key Capabilities](#key-capabilities)
- [System Architecture](#system-architecture)
- [Architectural Principles](#architectural-principles)
- [Tech Stack](#tech-stack)
- [Getting Started](#getting-started)
- [Environment Configuration](#environment-configuration)
- [Project Structure](#project-structure)
- [Core Design Patterns](#core-design-patterns)
- [Security Model](#security-model)
- [Routing & Role Model](#routing--role-model)
- [Internationalisation](#internationalisation)
- [Testing Strategy](#testing-strategy)
- [Performance & Scalability](#performance--scalability)
- [Development Guidelines](#development-guidelines)
- [Known Limitations](#known-limitations)
- [Roadmap](#roadmap)
- [Contributing](#contributing)

---

## Executive Overview

ParaShift is a production-grade workforce management SPA built for retail and hospitality operations teams. It targets **store managers**, **employees**, and **system administrators** who need to plan, adjust, and track weekly shift schedules across multiple locations.

The product replaces brittle spreadsheet-based scheduling with a structured workflow: managers drag and drop shifts onto a resource calendar, a live rule engine validates every assignment in real time, and an AI layer surfaces smarter suggestions based on coverage gaps and historical patterns. Employees get a dedicated self-service view to check their week, request leave, and propose shift swaps — without ever needing to contact a manager directly.

What sets ParaShift apart is the tight feedback loop between planning and compliance: rule violations surface immediately on the calendar with severity-graded badges, blocking assignments are rolled back automatically, and coverage gaps are tracked on a live heatmap updated after every change.

---

## Product Positioning

ParaShift occupies the space between lightweight scheduling tools and heavyweight enterprise workforce systems — and is deliberately better than both in its target context.

**What it replaces**

Most scheduling operations at this scale still run on spreadsheets, WhatsApp groups, or consumer-grade tools (e.g. When I Work, Homebase). These lack rule enforcement, audit trails, and any meaningful AI layer. ParaShift replaces them with a structured, API-backed planning workflow.

**What it avoids**

Enterprise WFM platforms (SAP, Kronos, UKG) are powerful but expensive, slow to deploy, and built for HR generalists, not frontline operations. ParaShift is designed for store managers who need to act fast — the planner is the core experience, not a menu item buried five levels deep.

**Target environments**

- Multi-location retail chains (5–200 stores, 10–50 employees per location)
- Hospitality and F&B operations with shift-based staffing
- Any environment where scheduling compliance (labour law, rest periods, qualification requirements) is operationally critical

**Deployment model**

Single-tenant or multi-tenant SaaS. The frontend is environment-agnostic — it connects to any conforming backend and any standards-compliant OAuth2 / OIDC provider. There is no vendor lock-in at the UI layer.

---

## Core User Flow

The primary journey is the manager's weekly planning cycle. It is designed to go from blank week to published schedule in under 10 minutes for a typical 20-person store.

1. **Open the planner** — Navigate to `/stores/:storeId/planner`. The resource calendar loads with the current ISO week, one column per employee, and unassigned shifts listed in the side panel.

2. **Assign shifts** — Drag a shift from the side panel onto an employee column. The assignment is committed optimistically (instant visual feedback) while the backend validates in parallel.

3. **Review rule feedback** — If the assignment violates a rule, a severity badge appears on the event. BLOCKING violations revert the drag automatically and show a toast. WARNINGs keep the assignment live with an amber indicator. The manager can inspect the violation detail inline.

4. **Consult AI suggestions** — Open the AI panel (drawer, accessible from the toolbar). Select a shift to get ranked employee suggestions with confidence scores and plain-language reasoning. One click assigns.

5. **Check coverage** — The coverage heatmap (day × hour grid) updates silently after each assignment. Gaps surface in red. The alert banner at the top of the planner links directly to the heatmap view when gaps exist.

6. **Manage leave and swaps** — Review pending leave requests and shift-swap proposals from the dedicated approval queues. Approved changes are reflected in the planner immediately.

7. **Publish the template** — Once satisfied, publish the A or B shift template to generate shifts for the next 1–4 weeks, with a confirmation dialog before any destructive generation.

---

## Key Capabilities

**For managers**
- Drag-and-drop weekly planner with resource-based calendar (one column per employee)
- Real-time rule engine — BLOCKING violations prevent invalid assignments; WARNINGs surface as amber badges
- AI-powered shift suggestions with confidence scores and one-click assignment
- AI insights panel (coverage gaps, rest violations, fairness and cost signals)
- A/B shift template editor for publishing repeating schedules up to 4 weeks ahead
- Coverage heatmap showing staffing ratio by day and hour
- Leave approval workflow and shift-swap approval queue

**For employees**
- Weekly schedule strip with swipe navigation
- Leave request form with calendar date picker
- Shift-swap inbox — accept or decline incoming proposals in one tap

**For administrators**
- Tenant settings with immediate persistence
- Employee and contract management tables
- Role-based access control across all views

### AI Layer

AI is embedded into the planning workflow, not bolted on. It operates at two levels:

- **Decision support** — The shift suggestion engine ranks available employees for a selected shift by predicted fit, surfacing a confidence score and a human-readable reason for each candidate. Managers retain full control; AI never assigns automatically.
- **Coverage optimisation** — The insights panel continuously analyses the week's assignments against required staffing levels, flagging under-covered slots before they become a problem.
- **Fairness and cost signals** — Insights include rest-period violations, workload imbalance across employees, and cost anomalies — giving managers a broader view than shift coverage alone.

AI endpoints use a dedicated 120 s timeout factory to avoid blocking the core planning UI during inference. The AI panel is lazy-loaded and does not affect initial bundle size.

---

## System Architecture

ParaShift is a client-side SPA. It communicates with a single backend REST API and delegates authentication to an external OAuth2 / OIDC provider via a PKCE flow. There is no server-side rendering.

```
┌─────────────────────────────────────────────────────────────┐
│                      Browser (SPA)                          │
│                                                             │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌───────────┐  │
│  │ Planner  │  │ Employee │  │  Rules   │  │   Admin   │  │
│  │  (mgr)   │  │ self-svc │  │  & AI    │  │   panel   │  │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘  └─────┬─────┘  │
│       └─────────────┴──────────────┴──────────────┘        │
│                        Pinia stores                         │
│                     Vue Router guards                       │
│                      Axios + interceptors                   │
└────────────────────┬──────────────────────────┬────────────┘
                     │ REST / JSON               │ PKCE
                     ▼                           ▼
             ┌───────────────┐         ┌──────────────────┐
             │  ParaShift    │         │  OAuth2 / OIDC   │
             │  Backend API  │         │  Provider        │
             │  (port 8080)  │         │  (port 9000)     │
             └───────────────┘         └──────────────────┘
```

The frontend is decomposed into **feature slices** — vertical cuts of the domain, each owning its own components, stores, composables, and views. Cross-feature communication happens exclusively through Pinia stores, never through direct component coupling.

---

## Architectural Principles

These are the non-negotiable design decisions that shape every part of the codebase. They exist to keep the system maintainable as the feature set grows.

- **Domain-driven feature slices.** The codebase is organised by business domain, not by technical layer. A new developer working on leave management touches only `features/leave/` — they don't need to understand the planner.

- **Optimistic UI by default.** Every mutation updates local state before the server responds. Rollback is explicit and handled at the store layer, not scattered through components. This gives the app a native-app feel over variable-latency networks.

- **Strict separation of concerns.** Views orchestrate. Stores own data and mutations. Components render and emit. Composables encapsulate reusable stateful logic. These boundaries are enforced by convention and code review — not by framework mechanisms.

- **API-first, typed contracts.** All API response shapes are declared in `src/types/index.ts` and mirror backend DTOs exactly. There is no runtime type coercion. If the backend changes a field, TypeScript surfaces the breakage at build time.

- **No hidden side effects.** Stores do not import each other. There are no reactive watchers that trigger cross-domain mutations silently. Data flows are explicit and traceable.

---

## Tech Stack

### Core

| Library | Version | Why |
|---|---|---|
| Vue | 3.5 | Composition API + `<script setup>` gives fine-grained reactivity with minimal boilerplate |
| Vite | 8 | Sub-second HMR; first-class TypeScript and Vue SFC support |
| TypeScript | 5.9 | Full type safety across API boundaries, stores, and component props |

### State & routing

| Library | Version | Why |
|---|---|---|
| Pinia | 3 | Composition-API stores that work naturally with Vue's reactivity system; first-class DevTools support |
| Vue Router | 4 | Native code-splitting via `() => import(…)` on every route |

### UI & calendar

| Library | Version | Why |
|---|---|---|
| PrimeVue (Aura) | 4 | Comprehensive, accessible component set; `definePreset` enables brand-consistent theming without forking |
| Tailwind CSS | 3 | Utility-first layout; no CSS specificity wars with PrimeVue |
| FullCalendar `resourceTimeGrid` | 6 | The only open-source calendar that supports multi-resource column layouts with native drag-and-drop |
| primeicons | 7 | Consistent icon set across all PrimeVue components |

### Networking & utilities

| Library | Version | Why |
|---|---|---|
| Axios | 1 | Interceptor-based token refresh; consistent error shape across all endpoints |
| vue-i18n | 10 | Composition-mode i18n; `legacy: false` keeps it tree-shakeable |
| @vueuse/core | 14 | `useSwipe` and other composable primitives — avoids hand-rolling browser API wrappers |

### Testing

| Library | Version | Why |
|---|---|---|
| Vitest | 3 | Native Vite integration; same transform pipeline as production — no config drift |
| @vue/test-utils | 2 | Official mounting utilities; deep PrimeVue component interaction |
| Playwright | 1.51 | Full-browser E2E with `page.route` API mocking — tests the real bundle |

---

## Getting Started

### Prerequisites

- Node.js ≥ 20 (LTS)
- npm ≥ 10
- ParaShift backend running on `http://localhost:8080`
- An OAuth2 / OIDC provider on `http://localhost:9000` (Keycloak, Auth0, or the bundled dev mock)

### Setup

```bash
# Install dependencies
npm install

# Configure environment
cp .env.example .env.local
# → Edit .env.local with your backend and auth provider URLs

# Start dev server
npm run dev
```

**Expected result:** App available at `http://localhost:5173`. Unauthenticated users are redirected to the login page immediately.

### Troubleshooting

If `npm run dev` throws *"Cannot find native binding"* from `rolldown`, npm silently skipped an optional native dependency (a [known npm bug](https://github.com/npm/cli/issues/4828) affecting arm64 macOS). Fix with a clean reinstall:

```bash
rm -rf node_modules package-lock.json && npm install
```

---

## Environment Configuration

Copy `.env.example` to `.env.local`. Vite only exposes variables prefixed with `VITE_` to the browser bundle.

| Variable | Required | Description |
|---|---|---|
| `VITE_API_BASE_URL` | ✅ Critical | Base URL of the ParaShift REST API |
| `VITE_AUTH_CLIENT_ID` | ✅ Critical | OAuth2 client ID registered with your identity provider |
| `VITE_AUTH_BASE_URL` | ✅ Critical | Base URL of the OAuth2 / OIDC server |
| `VITE_AUTH_REDIRECT_URI` | ✅ Critical | Full callback URL for the PKCE redirect (must match IdP config) |
| `VITE_DEFAULT_LOCALE` | Optional | UI locale — `en` (default) or `fr` |

**Security note:** `.env.example` is committed with safe placeholder values. `.env.local` (and any file containing real credentials) must never be committed. All `VITE_` values are inlined into the JS bundle at build time and therefore **visible to end users** — never put client secrets here.

---

## Project Structure

```
src/
├── assets/                  # Static images and SVGs
├── components/              # Shared, domain-agnostic components
│   ├── layout/
│   │   └── AppShell.vue     # Root layout: sidebar nav + page slot
│   ├── ErrorBoundary.vue    # onErrorCaptured wrapper with retry
│   ├── KSaveBanner.vue      # Ambient dirty-state indicator
│   └── SeverityBadge.vue    # Rule violation severity chip
├── composables/             # App-level composables
│   ├── useApi.ts            # Axios singleton + timeout-scoped factories
│   ├── useAuth.ts           # PKCE code challenge + state validation
│   └── useDirtyState.ts     # Module-keyed save-state registry
├── features/                # Domain feature slices (see below)
│   ├── ai/                  # Suggestions & insights panel
│   ├── admin/               # Tenant settings, employees, contracts
│   ├── coverage/            # Coverage heatmap and alert banner
│   ├── employee/            # Employee self-service (MyWeek)
│   ├── employees/           # Employee list store (read-only in planner)
│   ├── leave/               # Leave requests: create, approve, reject
│   ├── rules/               # Scheduling rules CRUD
│   ├── schedule/            # Planner grid + assignment business logic
│   ├── swap/                # Shift-swap requests and inbox
│   └── templates/           # A/B shift template editor
├── plugins/
│   ├── i18n.ts              # vue-i18n: fr + en message trees
│   └── primevue.ts          # PrimeVue with ParaShiftPreset (sky-blue Aura)
├── router/index.ts          # Routes, role guards, UI layer sync
├── stores/
│   ├── auth.ts              # Auth state: user, tokens, PKCE lifecycle
│   ├── storeContext.ts      # Active store, week window, A/B scheme
│   └── ui.ts               # Toast queue, global loading, active layer
├── test/setup.ts            # Vitest globals: mocks, stubs, browser API shims
├── types/index.ts           # All TypeScript interfaces mirroring API DTOs
├── utils/logger.ts          # extractApiError, tree-shakeable devlog
├── views/                   # Top-level route components (Login, Callback, 404)
├── App.vue                  # Root: RouterView + Toast + ConfirmDialog
├── env.d.ts                 # ImportMetaEnv type declarations
└── main.ts                  # Bootstrap: Pinia, Router, i18n, PrimeVue
```

### Feature slice anatomy

Every feature follows the same internal structure, enforcing consistent separation of concerns:

```
features/<domain>/
├── components/    # Presentational — no direct API calls
├── composables/   # Stateful logic (e.g. usePlannerCalendar)
├── stores/        # Pinia stores: data fetching, mutations, derived state
│   └── __tests__/ # Unit specs co-located with the code they test
└── views/         # Route-level containers: orchestrate stores + components
```

This structure scales because each feature is independently relocatable, independently testable, and never creates implicit coupling to another feature's internals. Cross-domain reads go through Pinia; there are no direct store-to-store imports.

---

## Core Design Patterns

### 1. Dirty-state tracking

**Problem:** Multiple editable views need a consistent, ambient "unsaved changes" indicator without duplicating save-state logic everywhere.

**Solution:** `useDirtyState(key)` maintains a module-level `Map` of states per domain key. Any component that calls the same key shares the same reactive state. `KSaveBanner` consumes the returned handle and cycles through four visual states: amber (dirty) → blue (saving) → green (saved, 3 s auto-fade) → red (error).

```ts
const dirty = useDirtyState('rules')

async function createRule(payload) {
  dirty.markSaving()
  try {
    await api.post('/rules', payload)
    dirty.markClean()
  } catch (err) {
    dirty.markError(extractApiError(err))
    throw err
  }
}
```

---

### 2. Optimistic updates with snapshot rollback

**Problem:** Drag-and-drop scheduling must feel instant, but the backend is the source of truth for rule violations.

**Solution:** `scheduleStore.assign()` mutates local state immediately, then validates server-side. BLOCKING violations trigger a full rollback and throw `BlockingViolationError`, which `PlannerView` catches to call FullCalendar's `revert()` — undoing the visual drag without a detectable flash.

```
assign(storeId, shiftId, employeeId)
  └─ snapshot = [...assignments]          // save rollback point
  └─ push optimistic entry                // instant visual feedback
  └─ POST /assignments
       ├─ violations: []        → commit (replace optimistic with server record)
       ├─ violations: WARNING   → commit + surface amber badge
       └─ violations: BLOCKING  → rollback to snapshot + throw BlockingViolationError
```

WARNING violations keep the assignment live; only BLOCKING reverts it. After any successful mutation, `coverageStore.fetchCoverage(storeId, true)` refreshes coverage data silently (no spinner) to keep the heatmap current.

---

### 3. Rule violation registry

**Problem:** FullCalendar events need to reflect rule violations reactively without coupling the calendar library to Pinia.

**Solution:** `useRuleViolations` maintains a singleton `Map<"shiftId:employeeId", RuleViolation[]>` in a `ref`. The map reference is replaced on each write (not mutated) so Vue's dependency tracking fires reliably. `ShiftEventContent` reads `worstSeverity()` and renders the appropriate icon:

| Severity | Icon | Colour |
|---|---|---|
| BLOCKING | `pi-ban` | Red |
| WARNING | `pi-exclamation-triangle` | Amber |
| INFO | `pi-info-circle` | Blue |

---

### 4. API client factories

**Problem:** Different endpoint categories have fundamentally different latency profiles — AI endpoints can take 30–120 s, schedule mutations should fail fast.

**Solution:** A singleton Axios instance has a 5 s default timeout. `createTimedApi(ms)` wraps it with an override:

| Factory | Timeout | Use case |
|---|---|---|
| `useScheduleApi()` | 10 s | All schedule mutations |
| `useReportApi()` | 30 s | Coverage and report downloads |
| `useAIApi()` | 120 s | AI suggestion and insight endpoints |

A 401 interceptor queues all in-flight requests, performs a single token refresh, then replays the queue — preventing race conditions when multiple requests expire simultaneously.

---

### 5. PKCE OAuth2 flow

**Problem:** Single-page applications cannot safely store a client secret, so implicit grant is disallowed by current OAuth 2.1 recommendations.

**Solution:** `useAuth.ts` implements full PKCE:
1. Generate a 128-character cryptographically random `code_verifier`
2. SHA-256 hash it and base64url-encode it → `code_challenge`
3. Store verifier + `state` nonce in `sessionStorage`
4. Redirect to the IdP's authorisation endpoint
5. On `/callback`, validate `state` and exchange the code for tokens

For E2E tests, `window.__E2E_AUTH__` can be pre-seeded via Playwright's `addInitScript`, bypassing the browser redirect entirely without touching production code paths.

---

## Security Model

### Authentication

- **PKCE** is used exclusively — no implicit grant, no client secrets in the browser
- Access tokens are stored in memory (Pinia store), not `localStorage`, to limit XSS exposure
- Refresh tokens are handled server-side by the identity provider; the frontend never stores them
- `state` parameter validation on the callback route prevents CSRF-style redirect attacks

### Authorisation

- Route guards enforce role checks on every navigation (see [Routing & Role Model](#routing--role-model))
- Role is derived from the token claim returned by `GET /api/v1/me` — the frontend never self-assigns roles
- Admin users can access all manager routes; role elevation does not bypass backend checks

### Frontend security boundaries

- All `VITE_` environment variables are inlined into the JS bundle and **must be treated as public** — they are visible to any user who opens DevTools
- Never store credentials, API secrets, or PII in environment variables or `localStorage`
- `v-html` is not used anywhere in the codebase — all dynamic content is rendered through Vue's template system, which escapes by default, eliminating the primary XSS vector in Vue applications
- The app respects and does not interfere with CSP headers set by the backend or CDN. No inline scripts, no `eval`, no dynamic `Function()` calls are introduced by application code
- Token lifetime and rotation policy are enforced entirely by the identity provider; the frontend is a consumer, not a policy owner

---

## Routing & Role Model

### Access control

The router's `beforeEach` guard checks authentication status and role on every navigation. Unauthenticated users are redirected to `/login` with `?redirect=` preserving their intended destination. Role mismatches redirect to `/login` without exposing the target route.

```
unauthenticated        → /login?redirect=<target>
role mismatch          → /login
authenticated + match  → render route
```

### Role matrix

| Role | Routes |
|---|---|
| `manager` | Planner, Rules, Coverage, Templates, Leave approval, Swap approval |
| `employee` | My Week, Leave (own requests) |
| `admin` | All manager routes + `/admin/**` (settings, employees, contracts) |

### UI layer sync

An `afterEach` hook maps each route's `layer` meta field (`planner | employee | admin`) to `uiStore.layer`, which drives which navigation items the sidebar renders. This keeps routing logic and UI state in sync without manual calls from each view.

---

## Internationalisation

All user-visible strings go through `$t()`. Message files live in `src/plugins/i18n.ts` organised by domain namespace:

| Namespace | Covers |
|---|---|
| `common` | Generic labels: save, cancel, loading, errors |
| `nav` | Sidebar navigation items |
| `auth` | Login page, auth error messages |
| `schedule` | Planner, shifts, assignments |
| `rules` | Rule types and config field labels |
| `ai` | Suggestions, insights, confidence copy |
| `leave` | Leave types, statuses, form labels |
| `swap` | Swap inbox, status labels |

vue-i18n runs in composition mode (`legacy: false`) and is configured with `VITE_DEFAULT_LOCALE` as the fallback. Adding a runtime locale switcher requires nothing more than a `<Select>` bound to `i18n.locale`.

---

## Testing Strategy

### Philosophy

- **Stores and composables** are unit-tested in isolation — they contain all business logic and are framework-agnostic enough to test directly
- **Components** are tested only where behaviour is non-trivial (e.g. `KSaveBanner` state transitions, `ShiftEventContent` violation rendering)
- **API calls** are always mocked — tests assert the contract (what is called, with what payload), not HTTP mechanics
- **E2E tests** own the full user journey — they run against the real built bundle with `page.route` API mocking

### Unit & component tests — Vitest

```bash
npm test                 # single run (111 tests across 12 suites)
npm run test:watch       # watch mode
npm run test:coverage    # V8 coverage — 80 % statement threshold enforced
```

**Key conventions:**

Every Pinia test calls `setActivePinia(createPinia())` in `beforeEach` for a clean store graph. `vi.mock()` factories always use `vi.hoisted()` to avoid the hoisting `ReferenceError`:

```ts
const { mockPost } = vi.hoisted(() => ({ mockPost: vi.fn() }))

vi.mock('@/composables/useApi', () => ({
  useScheduleApi: () => ({ post: mockPost }),
}))
```

Pinia's `reactive()` wrapper auto-unwraps nested refs — assert `store.dirty.state` (string), not `store.dirty.state.value`.

Coverage is collected over stores and composables only. Views and pure presentational components are excluded from the threshold.

### End-to-end tests — Playwright

```bash
npm run e2e        # build → preview → headless Chromium
npm run e2e:ui     # Playwright interactive runner
```

E2E tests live in `e2e/` and are invisible to Vitest (Vite config includes only `src/**/*.spec.ts`). Key fixtures in `e2e/fixtures.ts`:

| Fixture | Purpose |
|---|---|
| `injectAuth()` | Pre-seeds `window.__E2E_AUTH__` to skip the OAuth redirect |
| `mockApiCalls()` | Registers `page.route` handlers with deterministic UUID fixtures |
| `injectStoreContext()` | Patches live Pinia state for week and store context |
| `managerPage` / `employeePage` | Role-scoped extended fixtures |

In CI: single worker, `reuseExistingServer: false`, 2 retries on failure, GitHub Actions reporter.

---

## Performance & Scalability

### Bundle splitting

Vite's `manualChunks` splits the bundle into four vendor chunks, keeping the critical-path payload small:

| Chunk | Contents | Rationale |
|---|---|---|
| `vendor-vue` | vue, vue-router, pinia | Always needed; load first |
| `vendor-primevue` | primevue, @primevue/themes | Large but shared across all views |
| `vendor-fullcal` | @fullcalendar/* | Only needed on the Planner route |
| `vendor-utils` | axios, vue-i18n, @vueuse/core | Utilities loaded once |

### Route-level code splitting

Every route is lazy-loaded via `() => import(…)`. A user who only visits the Employee self-service view never downloads the FullCalendar or AI panel bundles.

### API latency handling

- Timeout-scoped API factories prevent slow AI endpoints from blocking UI interactions
- The 401 interceptor queues concurrent requests during token refresh instead of failing them
- Coverage data refreshes silently after mutations — no loading spinner, no layout shift
- Skeleton placeholders (PrimeVue `Skeleton`) fill heatmap and AI panel while data loads

### Scalability considerations

The feature-slice architecture means new domains can be added without touching existing code. Store composition is horizontal (feature stores are independent); there are no store inheritance chains. FullCalendar's `lazyFetching: true` limits event rendering to the visible time range.

---

## Development Guidelines

### Architecture rules

- **Feature slices are the unit of organisation.** Never import a component or composable directly from another feature's directory — expose shared logic through Pinia or `src/composables/`
- **Views orchestrate; components render.** Views connect stores to components. Components receive props and emit events — they do not call stores directly
- **No barrel files.** Import from the file that owns the export, not from a re-export index
- **`useDirtyState` for anything editable.** Every store that performs mutations must register with `useDirtyState` and drive a `KSaveBanner`

### Coding standards

- Vue 3 Composition API + `<script setup>` throughout — no Options API
- TypeScript strict mode — all API responses typed against `src/types/index.ts`; avoid `any`, narrow `unknown` explicitly
- Pinia stores use the setup-function form: `defineStore('key', () => { … })`
- `devlog` (from `src/utils/logger.ts`) is the only permitted logging call in production paths — it is tree-shaken in non-dev builds via `import.meta.env.DEV`
- Error messages surfaced to users must go through `extractApiError()` — never expose raw Axios error objects

### UI & i18n rules

- All user-visible strings go through `$t()` — no hardcoded English in templates
- Tailwind for layout and spacing; PrimeVue for interactive component styles — do not override PrimeVue internals with Tailwind
- New components must use the `ParaShiftPreset` colour tokens, not hardcoded hex values
- PrimeVue components are used directly (`<Button>`, `<DataTable>`) — wrapping is only justified when additional behaviour is encapsulated

---

## Known Limitations

These are honest constraints of the current implementation. Most are on the roadmap.

- **No offline support.** The app requires a live network connection to the backend API. There is no service worker, no local cache, and no graceful degradation for connectivity loss during planning sessions.
- **Mobile experience is limited.** The resource-grid planner is not usable on phone-sized screens. The employee self-service view (`MyWeekView`) is usable on tablet but not optimised for it. A responsive planner redesign is planned.
- **Backend dependency for all rule validation.** Rule violations are computed server-side. There is no client-side pre-validation before an assignment is submitted. On high-latency connections, the optimistic UI can show a shift as placed before reverting it on a BLOCKING violation — a perceptible flash in degraded network conditions.
- **AI quality depends on data maturity.** Suggestion confidence scores and fairness signals degrade significantly with sparse historical data. Stores in their first 4–6 weeks of operation will see lower-quality AI output.
- **Single IdP per deployment.** The PKCE flow is configured for one OAuth2 / OIDC provider per environment. Multi-IdP federation (e.g. enterprise SSO alongside a local provider) requires backend changes and is not supported out of the box.
- **No real-time collaboration.** Two managers editing the same week simultaneously will not see each other's changes until they refresh. There is no WebSocket-based live sync; conflict handling is last-write-wins at the API layer.

---

## Roadmap

The following areas are planned or under consideration:

- **AI enhancements** — multi-week suggestion horizon, fairness-aware optimisation, natural language schedule queries
- **Offline support** — service worker + IndexedDB cache for planner access during connectivity loss
- **Push notifications** — real-time swap and leave approval alerts via WebSocket or SSE
- **Accessibility audit** — WCAG 2.1 AA compliance pass across all interactive components
- **Dark mode** — `ParaShiftPreset` already defines `darkModeSelector: '.dark-mode'`; toggle UI is the remaining work
- **Mobile planner** — responsive breakpoints for tablet-first manager workflows
- **Multi-store dashboard** — cross-location coverage view for area managers

---

## Contributing

1. Branch from `main` using the convention `feat/<topic>` or `fix/<topic>`
2. Run `npm run lint` and `npm test` before opening a PR — both must pass
3. New features require unit tests for stores/composables and at least one E2E scenario
4. Keep PRs focused — one feature or fix per PR
