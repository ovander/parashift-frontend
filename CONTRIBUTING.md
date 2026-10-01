# Contributing to the Parashift web app

Thank you for your interest. Parashift is two repositories: this Vue web app and the Go API,
[`ovander/parashift-backend`](https://github.com/ovander/parashift-backend). Contributions are
accepted under the project's licence, [AGPL-3.0](LICENSE).

## Development setup

Requirements: Node 24 (`.nvmrc`), and a running API for anything past the landing page.

```bash
git clone https://github.com/ovander/parashift-frontend && cd parashift-frontend
npm ci
cp .env.example .env.local   # optional VITE_* values, see the README
npm run dev                  # http://localhost:5181
```

## Project layout

- `src/features/<domain>/` — one folder per business area (`views/`, `components/`, `stores/`,
  `composables/`, `utils/`).
- `src/components`, `src/composables`, `src/stores`, `src/utils` — shared pieces. API calls go
  through `src/composables/useApi.ts`.
- `src/locales/{en,fr}/*.json` — every user-visible string, in both languages.
- `src/router/index.ts` — routes and the role guard.
- `e2e/` — Playwright tests and their fixtures.

Standing rules for changes (also followed by Claude Code) are in [`CLAUDE.md`](CLAUDE.md).

## Tests and checks

Run these before opening a pull request; CI runs the same:

```bash
npx vue-tsc -b
npm run lint:i18n           # no errors; the warning cap only goes down
npx vitest run
npm audit --omit=dev --audit-level=high
npx vite build
npx playwright test
```

- Unit tests sit next to the code in `__tests__/` (`*.spec.ts`).
- End-to-end tests mock the API (`e2e/fixtures.ts`) and never reach a real backend or Socrate.
- A bug fix comes with a test that fails without it.
- Never weaken a check to get green: no skipped test, no `eslint-disable` or `@ts-expect-error`
  without a one-line reason, no raised warning cap.

## Pull requests

1. Branch from `main` (`feat/…`, `fix/…`, `chore/…`, `ci/…`, `docs/…`).
2. Commit with [Conventional Commits](https://www.conventionalcommits.org/) (`feat:`, `fix:`,
   `chore:`, `docs:`, `ci:`, `test:`).
3. Add a line under `## [Unreleased]` in [`CHANGELOG.md`](CHANGELOG.md).
4. Open the PR with the template filled in, with screenshots for visible changes, and say if it
   needs an API release first.
5. CI must be green. The maintainer reviews and merges.

## Releases

The maintainer tags `vX.Y.Z` on `main` after moving the `[Unreleased]` section under the new
version; the tag publishes a GitHub Release with those notes and the built app
(`.github/workflows/release.yml`). Deploys are run by the maintainer with `scripts/push.sh`.

## Security

Do not open a public issue for a vulnerability; see [`SECURITY.md`](SECURITY.md).
