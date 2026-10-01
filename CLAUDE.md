# CLAUDE.md — parashift-frontend

Standing instructions for Claude Code in this repository. Read this file before any change. The
API lives in `ovander/parashift-backend`; many changes touch both.

## Project in one paragraph

Parashift plans shifts for pharmacies: a planner and coverage views for managers, "today" and
"my week" for employees, and a cross-store admin area. This repository is the web app: Vue 3
single-page application in TypeScript, Vite, Pinia, vue-router, PrimeVue 4, Tailwind CSS 3 and
FullCalendar, in English and French. Sign-in is Socrate (`https://socrate.vandermoten.eu`); it is
moving to the backend's Backend-for-Frontend (`/bff`), after which the SPA holds no token.

## Sources of truth, in order

1. The code. Read it before proposing changes; do not describe code you have not opened.
2. The backend's router and handlers for API shapes: check the response the backend really
   sends, not the one a unit test mocks.
3. `parashift-backend/docs/SOCRATE-COMPAT-REPORT.md` for the identity-provider contract, known
   findings and the migration plan; Ascenda's retrospective
   (`ovander/ascenda-backend`, `docs/SOCRATE-MIGRATION-2026-10-01.md`) for its lessons.

## Hard rules

- **Layout.** A feature lives in `src/features/<domain>/` (`views/`, `components/`, `stores/`,
  `composables/`, `utils/`); shared pieces in `src/components`, `src/composables`, `src/stores`.
- **API calls** go through `src/composables/useApi.ts`. Do not call the API with raw
  `fetch`/`axios` elsewhere.
- **Tokens.** Do not add token, PKCE or OAuth-state code, and never put auth data in
  `localStorage` or `sessionStorage`: that code is being removed (report rows S2, S3). After the
  BFF, every API call is a same-origin path with the session cookie and `X-CSRF-Token`, never an
  `Authorization` header.
- **Strings.** Every user-visible string is an i18n key present in both `src/locales/en/*.json`
  and `src/locales/fr/*.json` (`i18n-parity.spec.ts`, `npm run lint:i18n`).
- **Never weaken a gate** to get green: no skipped tests, no `eslint-disable` or
  `@ts-expect-error` without a one-line reason, no raised warning cap, no removed check.
- **Secrets** never enter the repository. Every `VITE_*` value ends up in the served JavaScript:
  public values only.
- **Scope.** One change per PR; do not widen a PR with unrelated fixes.

## Local gate (the same checks as CI)

```bash
npm ci
npx vue-tsc -b                 # typecheck
npm run lint:i18n              # ESLint: no errors; the warning cap only goes down
npx vitest run                 # unit tests
npm audit --omit=dev --audit-level=high
npx vite build                 # production build
npx playwright test            # e2e against the production build (mocks every API call)
```

Node 24 (`.nvmrc`). Run the gate, **check each exit code**, and push only when all pass; never
chain a push after a command that may fail.

## Tests

- Unit tests sit next to the code in `__tests__/` (`*.spec.ts`, Vitest with jsdom).
- End-to-end tests are in `e2e/` (Playwright, Chromium); they never reach a real backend or the
  identity provider (`e2e/fixtures.ts`).
- A bug fix comes with a test that fails without it.

## Git workflow

- Branch from `main`: `feat/…`, `fix/…`, `chore/…`, `ci/…`, `docs/…`. Conventional Commits.
- Open a PR; never push to `main`, never force-push a shared branch, never merge with red CI.
  The owner merges, tags and deploys.
- Each PR adds a line under `## [Unreleased]` in `CHANGELOG.md`, and says in its body what it
  changes, how it was tested, and whether it needs a backend release first.

## Releases and deploys (the owner runs them)

- A release is an annotated tag `vX.Y.Z` on an updated `main`, with the `[Unreleased]` section
  moved under the new version. Tag only the merged release commit:
  `grep -q "^## \[X.Y.Z\]" CHANGELOG.md && git tag -a vX.Y.Z -m vX.Y.Z`. Pushing the tag runs
  `.github/workflows/release.yml`, which fails when the changelog section is missing.
- `scripts/push.sh` builds and rsyncs `dist/` to the apps VPS; the SSH settings live in
  `~/.config/parashift/deploy.env`, never in the repository. Delete stale local env files
  (`.env.production`, `.env.*.local`): Vite loads them even though git ignores them. Deploy after
  the backend when the API changed.
