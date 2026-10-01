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

- `npm run lint:i18n` runs: ESLint, `vue-eslint-parser` and `@typescript-eslint/parser` are
  dev dependencies, so `.vue` files parse. The 16 existing warnings are capped.
