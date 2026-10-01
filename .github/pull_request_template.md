## What and why

<!-- What this changes and why. Link the issue if there is one ("Closes #…"). -->

## How it was tested

<!-- New or changed tests, and anything checked in the browser. Screenshots for visible changes. -->

- [ ] `npx vue-tsc -b`, `npm run lint:i18n` (no errors), `npx vitest run` pass
- [ ] New strings are in both `src/locales/en/` and `src/locales/fr/`
- [ ] `npx playwright test` passes
- [ ] A line is added under `## [Unreleased]` in `CHANGELOG.md`

## Deploy notes

<!-- Delete what does not apply. -->
- Needs an API release first: <!-- version or PR; deploy the API first -->
- New or changed `VITE_*` variable: <!-- name; public values only -->
