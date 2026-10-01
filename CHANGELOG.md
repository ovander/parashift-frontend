# Changelog

All notable changes to this project are documented here. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and versions follow
[Semantic Versioning](https://semver.org/).

## [Unreleased]

### Added

- `CLAUDE.md` (sources of truth, hard rules, local gate, git workflow) and this changelog.
- CI (`.github/workflows/ci.yml`): typecheck, i18n lint, unit tests, build, Playwright e2e.
- `.nvmrc` (Node 24).

### Fixed

- High-severity advisories in production dependencies (axios, form-data, nanoid, postcss):
  `npm audit fix`. CI now fails on a high or critical advisory in production dependencies.

- `npm run lint:i18n` runs: ESLint, `vue-eslint-parser` and `@typescript-eslint/parser` are
  dev dependencies, so `.vue` files parse. The 16 existing warnings are capped.
