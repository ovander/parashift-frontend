# Changelog

All notable changes to this project are documented here. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and versions follow
[Semantic Versioning](https://semver.org/).

## [Unreleased]

### Added

- Repository kit for the public release: README rewritten (badges, accurate security,
  environment, testing and deployment sections), AGPL-3.0 licence, `CONTRIBUTING.md`,
  `SECURITY.md`, `CODEOWNERS`, pull-request and issue templates, and a release workflow that
  publishes a GitHub Release from a `vX.Y.Z` tag and its changelog section.

- `CLAUDE.md` (sources of truth, hard rules, local gate, git workflow) and this changelog.
- CI (`.github/workflows/ci.yml`): typecheck, i18n lint, unit tests, build, Playwright e2e.
- `.nvmrc` (Node 24).

### Changed

- `scripts/push.sh` reads the VPS address (`SSH_USER`, `SSH_HOST`, `SSH_PORT`) from the
  environment or `~/.config/parashift/deploy.env` instead of the repository.

### Fixed

- High-severity advisories in production dependencies (axios, form-data, nanoid, postcss):
  `npm audit fix`. CI now fails on a high or critical advisory in production dependencies.

- `npm run lint:i18n` runs: ESLint, `vue-eslint-parser` and `@typescript-eslint/parser` are
  dev dependencies, so `.vue` files parse. The 16 existing warnings are capped.
