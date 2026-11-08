# Changelog

All notable changes to this project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- A runtime package root entry point (`src/index.ts`) exporting the ontology
  loader, schema validator, composition prompts, and core types. The root used
  to resolve to `atoms/core.ts`, which is types only and compiled to `export {}`,
  so importing the package by name yielded an empty namespace.
- `engines.node` (`>=20.6.0`) and `.nvmrc`, which CI now reads, so the supported
  Node version is declared once instead of repeated in both workflow jobs.
- A packaging test that fails when an entry point resolves outside `files`, and a
  public-API test that asserts the root entry actually exports runtime symbols.

### Changed

- `npm run ci` now runs the evaluation self-check, matching the GitHub Actions
  workflow and the README's "everything CI runs" claim.
- CI uses `actions/checkout@v5` and `actions/setup-node@v5`, which run on the
  supported action runtime instead of the deprecated Node 20 one.

## [0.6.0] - 2026-10-22

### Added

- Behaviour tests for all 35 object atoms. One data-driven suite checks metadata
  against the ontology, declares every `PropertyDef` the factory writes, fills
  required fields, applies documented defaults, and round-trips optional inputs.
- `test/atom-test-coverage.test.ts`, a guard that fails when an atom module is
  imported by no test. It is a floor, not proof of assertion quality, but it
  catches entire untested families.
- `test/project.test.ts`, which fails when package, lockfile, ontology, and
  citation versions drift; when the atom count in the README badge, package
  description, or citation disagrees with the ontology; when the shipped version
  has no dated CHANGELOG entry; or when a test file is missing from the README
  inventory.

### Changed

- Bumped the version to 0.6.0 in `package.json`, `package-lock.json`,
  `ontology/periodic-table.json`, and `CITATION.cff`.
- README test inventory now lists every test file, and the status section reports
  that all six families have behaviour tests.
- The published package now includes `docs/`, `CHANGELOG.md`, and `CITATION.cff`,
  so the documentation links in the README resolve for npm consumers.
- Corrected `docs/CONTRIBUTING.md`, which claimed `npm run coverage` would show a
  drop when an atom has no test. Coverage measures implementations; the new
  import guard measures test presence.

### Fixed

- The ontology declared version 0.4.0 while the package and citation declared
  0.5.0. A consistency test now prevents the drift.
- `createSubscription` declared `cancelAt` in `SubscriptionProperties` but did
  not accept or set it. It now does.
- `createMessage` declared `readBy` in `MessageProperties` but did not accept or
  set it. It now does.
- The abstract in `CITATION.cff` still claimed composition was "more reliable and
  token-efficient", contradicting the withdrawn 39% result. The claim is gone.

## [0.5.0] - 2026-10-16

### Added

- Test coverage for all 8 intelligence atoms (Search, Summarize, Classify, Recommend, Analyze, Extract, Generate, Prompt)
- Test coverage for all 25 properties atoms (Status, Text, Number, Date, DateTime, Currency, Enum, Boolean, ID, Owner, Priority, CreatedAt, UpdatedAt, Score, Percent, Duration, Count, JSON, Address, AI, StartDate, EndDate, Email, Phone, URL)
- Test coverage for 11 previously untested actions atoms (Create/Update/Delete/View, Notify/Message/Assign, Search/Filter/Sort/Export)
- Test coverage for 4 previously untested interfaces atoms (Calendar, Chart, Detail, Form)
- Test coverage for 3 previously untested rules atoms (Audit, Permission, Policy)
- `test:coverage` npm script for running tests with coverage reporting

### Changed

- Updated README Roadmap to reflect current 100% reference implementation coverage
- Bumped version to 0.5.0 in package.json and CITATION.cff

### Fixed

- Corrected the stale Roadmap section in README that contradicted the Status section

## [0.4.0] - 2026-08-21

### Added

- 115 atoms across 6 families (ontology established in 0.2.0)
- Composition system prompt and plan schema
- Evaluation harness with baseline vs composition comparison
- Reference implementations for 90 of 115 atoms (25 missing: 14 actions, 9 interfaces, 2 rules)
- CI pipeline with validation, coverage, linting, and type-checking
