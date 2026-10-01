# Parashift web app

[![CI](https://github.com/ovander/parashift-frontend/actions/workflows/ci.yml/badge.svg)](https://github.com/ovander/parashift-frontend/actions/workflows/ci.yml)
[![License: AGPL-3.0](https://img.shields.io/github/license/ovander/parashift-frontend)](LICENSE)
[![Latest tag](https://img.shields.io/github/v/tag/ovander/parashift-frontend?sort=semver&label=version)](https://github.com/ovander/parashift-frontend/tags)
[![Node 24](https://img.shields.io/badge/node-24-339933?logo=node.js&logoColor=white)](.nvmrc)
[![Vue 3](https://img.shields.io/badge/vue-3.5-4FC08D?logo=vue.js&logoColor=white)](package.json)

> Shift planning for pharmacies: a drag-and-drop planner with live rule checks for managers,
> and a self-service week for every employee.

Parashift replaces the spreadsheet and the group chat that most pharmacies still plan with. A
manager builds the week on a resource calendar, one column per employee, and every assignment is
checked against the store's scheduling rules as it is made; coverage gaps show on a heatmap, and
an AI panel suggests who could take a shift. Employees see their day and their week, ask for
leave and propose swaps. This repository is the web app, a Vue 3 single-page application; the
API is [`ovander/parashift-backend`](https://github.com/ovander/parashift-backend), and sign-in
is Socrate, the suite's OAuth 2.1 / OpenID Connect server.

---

## Table of contents

- [Why Parashift](#why-parashift)
- [Features](#features)
- [Tech stack](#tech-stack)
- [Architecture](#architecture)
- [Project structure](#project-structure)
- [Getting started](#getting-started)
- [Environment variables](#environment-variables)
- [Testing](#testing)
- [Deployment](#deployment)
- [Security](#security)
- [Status](#status)
- [Contributing](#contributing)
- [License](#license)

---

## Why Parashift

A pharmacy's week is constrained: opening hours, a pharmacist present at all times, contract
hours, rest periods, qualifications, leave. Spreadsheets do not check any of it, and enterprise
workforce suites are built for HR departments, not for the manager who plans the week between
two customers. Parashift is built around that manager:

- **The planner is the product.** One screen, one column per employee, drag a shift onto a
  person. The week goes from blank to published without leaving it.
- **Rules are checked as you plan.** The backend validates every assignment. A blocking
  violation reverts the drag; a warning stays visible on the shift until it is resolved.
- **Coverage is always in view.** A day × hour heatmap updates after every change, and a banner
  links to the gaps.
- **Employees serve themselves.** Today's shifts, the week, leave requests and swaps, on a
  phone, without asking the manager.

---

## Features

### For managers

- Resource-calendar planner (FullCalendar `resourceTimeGrid`), drag and drop, with optimistic
  updates and rollback on a blocking rule violation.
- Scheduling rules: create, edit and switch off the rules the backend enforces.
- Coverage dashboard: heatmap by day and hour, month calendar, gap alerts.
- Week templates (A/B rotation) that generate the shifts of the coming weeks.
- Plan lifecycle: publish a week, record overrides after publication, version history and
  rollback.
- Leave and swap approval queues, with the impact of a leave request on coverage.
- Team view: employees, contracts, qualifications and their expiry.
- AI panel: ranked suggestions for a shift, with a confidence score and the reason, and insights
  on coverage, rest and fairness. The manager always decides.

### For employees

- **Today** and **My week** views, built for a phone (swipe between weeks), with an `.ics` export.
- Leave requests and the leave calendar; shift-swap proposals.

### For platform administrators

- Cross-store administration under `/admin`: dashboard, stores, managers, employees, contracts
  and the audit log.

The interface is in English and French; the language follows the user's profile.

---

## Tech stack

| Area | Choice |
|---|---|
| Framework | Vue 3.5 (Composition API, `<script setup>`), TypeScript 5.9 |
| Build | Vite 8 |
| State and routing | Pinia 3, Vue Router 4 (every route lazy-loaded) |
| UI | PrimeVue 4 (Aura preset, `ParaShiftPreset`), Tailwind CSS 3, primeicons |
| Calendar | FullCalendar 6 (`resourceTimeGrid`, interaction) |
| HTTP | Axios, through `src/composables/useApi.ts` only |
| i18n | vue-i18n 10 (composition mode), messages in `src/locales/{en,fr}/*.json` |
| Monitoring | Sentry (`@sentry/vue`), enabled only when `VITE_SENTRY_DSN` is set |
| Tests | Vitest 3 + Vue Test Utils (jsdom), Playwright (Chromium) |
| Lint | `vue-tsc`, ESLint 10 with a local `no-hardcoded-ui-strings` rule |

---

## Architecture

```
browser ── https://parashift.vandermoten.eu ── Caddy ─┬─ /api/* /bff/* /auth/* → Parashift API (Go, loopback)
                                                      └─ everything else → this SPA (static files)

sign-in: SPA → /bff/login → Socrate (https://socrate.vandermoten.eu) → /bff/callback → SPA
```

- **Feature slices.** Each business area lives in `src/features/<domain>/` with its own views,
  components, stores and composables. Features share data through Pinia stores, never by
  importing each other's components.
- **Optimistic updates.** `scheduleStore.assign()` updates the planner at once, then lets the
  backend validate: no violation or a warning commits the assignment; a blocking violation
  restores the snapshot and the calendar reverts the drag.
- **Rule-violation registry.** `useRuleViolations` keeps the violations per shift and employee
  so the calendar events show the worst severity (blocking, warning, info).
- **Save state.** `useDirtyState(key)` drives the `KSaveBanner` (unsaved, saving, saved, error)
  for every editable screen.
- **Timeouts per call type.** `useApi()` waits 5 s, `useScheduleApi()` 10 s,
  `useReportApi()` 30 s and `useAIApi()` 120 s, so a slow AI call never blocks the planner.
- **Role-aware routing.** Route `meta` names the required role (`manager`, `employee`, `admin`);
  the guard in `src/router/index.ts` redirects otherwise. The backend enforces the same rules.

**Sign-in runs on the backend (BFF).** The SPA has no Socrate setting and no token code. To sign
in it navigates to `/bff/login?return_to=<page>`; the API runs the authorization-code flow with
PKCE, keeps the tokens in its server-side session, sets the HttpOnly `__Host-parashift_session`
cookie and sends the browser back to the page. The router guard asks `GET /bff/session` once per
page load and keeps only its CSRF token, in memory; `useApi` calls the SPA's own origin, never
with an `Authorization` header, and sends `X-CSRF-Token` on POST, PUT, PATCH and DELETE. A 401
re-checks the session and signs in again to the same page; a stale CSRF token is refreshed and
the request retried once. An invite link (`/claim/<token>`) signs in back to itself, then claims.
`src/test/noBrowserTokens.spec.ts` fails if auth data reaches browser storage again.

---

## Project structure

```
src/
├── components/        shared components (AppShell layout, ErrorBoundary, KSaveBanner, …)
├── composables/       useApi (HTTP), useAuth (sign-in), useDirtyState, useLocale, …
├── features/          one folder per business area
│   ├── admin/         cross-store administration
│   ├── ai/            suggestions and insights panel
│   ├── config/        store configuration
│   ├── coverage/      heatmap, month calendar, gap banner
│   ├── employee/      Today and My week (employee self-service)
│   ├── employees/     employee list store
│   ├── leave/         leave requests, calendar and approval
│   ├── manager/       team view, week-template editor drawer
│   ├── qualifications/
│   ├── rules/         scheduling rules
│   ├── schedule/      planner, plan lifecycle, rule violations
│   ├── swap/          swap requests and approval
│   └── templates/     shift templates
├── locales/{en,fr}/   messages, one file per namespace
├── plugins/           i18n, PrimeVue (ParaShiftPreset)
├── router/            routes and the role guard
├── stores/            auth, storeContext, planStore, optionsStore, ui
├── types/             API types, mirroring the backend DTOs
├── utils/             devlog, extractApiError
└── views/             Landing, Login, Callback, Claim (invitations), 404
e2e/                   Playwright specs and fixtures
scripts/               push.sh (build and upload), deploy-frontend.sh (on the VPS)
```

---

## Getting started

### Prerequisites

- Node 24 (`.nvmrc`) and npm.
- The API running locally ([`parashift-backend`](https://github.com/ovander/parashift-backend),
  with its BFF configured, for anything past the landing page. `npm run dev` proxies `/api`,
  `/bff` and `/auth` to `PARASHIFT_API` (default `http://localhost:8080`), so the SPA calls its
  own origin and the session cookie works; the API's `BFF_REDIRECT_URL` is then
  `http://localhost:5181/bff/callback`, registered at Socrate.

### Install and run

```bash
git clone https://github.com/ovander/parashift-frontend && cd parashift-frontend
npm ci
cp .env.example .env.local      # then edit the values (see below)
npm run dev                     # http://localhost:5181
```

### Build

```bash
npm run build                   # vue-tsc -b && vite build → dist/
npm run preview                 # serve dist/ on http://localhost:4173
```

If `npm run dev` fails with *Cannot find native binding* from `rolldown`, npm skipped an optional
native package ([npm/cli#4828](https://github.com/npm/cli/issues/4828)): remove `node_modules` and
`package-lock.json`, then `npm install`.

---

## Environment variables

Vite reads `.env`, `.env.local` and `.env.[mode][.local]`; only `VITE_*` variables reach the
browser, and **every one of them ends up in the served JavaScript**: public values only, never a
secret. Git ignores every `.env*` file except `.env.example`, but Vite still loads them: delete
stale ones.

| Variable | Required | Meaning |
|---|---|---|
| `VITE_DEFAULT_LOCALE` | no | `en` or `fr` before the user's profile is known. |
| `VITE_FULLCALENDAR_LICENSE_KEY` | no | FullCalendar scheduler licence key; the non-commercial key by default. |
| `VITE_SENTRY_DSN` | no | Enables Sentry error monitoring. |

There is no API or Socrate setting: the app calls its own origin. `PARASHIFT_API` (a shell
variable, not `VITE_*`) only tells the dev server where to proxy. The build sets a
Content-Security-Policy with `connect-src 'self'` (plus the Sentry origin when
`VITE_SENTRY_DSN` is set).

---

## Testing

```bash
npx vue-tsc -b                  # typecheck
npm run lint:i18n               # ESLint: no errors; the hardcoded-string backlog is capped
npx vitest run                  # unit and component tests (jsdom)
npm run test:coverage           # with V8 coverage
npx playwright test             # end-to-end, against the production build
```

- Unit tests sit next to the code in `__tests__/` folders: stores, composables and the components
  whose behaviour is not trivial. API calls are mocked; tests check what is called and with what.
- End-to-end tests (`e2e/`) build the app, serve it with `vite preview` and mock every API call
  with `page.route` (`e2e/fixtures.ts`); they never reach a real backend or Socrate.
- `vitest.config.ts` sets an 80 % statement floor on stores and composables. It is **not met yet**
  (55.5 % on 2026-10-01) and not part of CI; raising coverage to it is open work.

CI (`.github/workflows/ci.yml`) runs the typecheck, the i18n lint, the unit tests, the production
dependency audit, the build, and Playwright on every pull request and on `main`.

---

## Deployment

The app is static files behind Caddy on the apps VPS, at `https://parashift.vandermoten.eu`:
`push.sh` uploads `dist/` to `/opt/apps/parashift/frontend`. Caddy must serve it with
`try_files {path} /index.html` (client-side routes) and send `/api/*`, `/bff/*` and `/auth/*` to
the API on loopback.

```bash
scripts/push.sh v0.2.0          # npm ci, production build, rsync dist/ to the VPS
```

`push.sh` reads the VPS address from `~/.config/parashift/deploy.env` (or the file named by
`PARASHIFT_DEPLOY_ENV`), never from the repository:

```bash
SSH_USER=deploy
SSH_HOST=vps.example.com
SSH_PORT=22
```

A release is an annotated `vX.Y.Z` tag on `main` with its `CHANGELOG.md` section; pushing the tag
publishes a GitHub Release with the notes and the built `dist/` (`.github/workflows/release.yml`).
Deploy the API before the app when the API changed.

---

## Security

Please report vulnerabilities privately; see [`SECURITY.md`](SECURITY.md). The known findings on
sign-in and their fixes are tracked in
[`parashift-backend/docs/SOCRATE-COMPAT-REPORT.md`](https://github.com/ovander/parashift-backend/blob/main/docs/SOCRATE-COMPAT-REPORT.md).

- No `v-html` anywhere: Vue's templates escape every value.
- All UI text goes through vue-i18n; `npm run lint:i18n` flags hardcoded strings.
- Roles come from the API (`GET /api/v1/me`), never from the browser; the router only mirrors the
  backend's rules.
- No token in the browser: sign-in runs on the backend's BFF, the session is an HttpOnly
  `__Host-` cookie, and the CSRF token lives in memory only (`noBrowserTokens.spec.ts` guards it,
  statically and at run time).
- The build's Content-Security-Policy pins `connect-src 'self'`; `useApi` refuses absolute URLs.

---

## Status

Deployed at `https://parashift.vandermoten.eu`. Current work, in order: the coverage floor and
the remaining hardcoded strings. Known limits: no offline mode, the planner needs a tablet or larger
screen, two managers editing the same week see each other's changes only after a refresh, and AI
suggestions improve with a few weeks of history.

---

## Contributing

Contributions are welcome; see [`CONTRIBUTING.md`](CONTRIBUTING.md) for the setup, the checks to
run and the pull-request rules. Every change goes through a pull request and green CI.

---

## License

[GNU Affero General Public License v3.0](LICENSE) (AGPL-3.0-only). If you run a modified version
as a network service, you must offer its users the source of your version.
