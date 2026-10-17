# Changelog

All notable changes to this project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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
