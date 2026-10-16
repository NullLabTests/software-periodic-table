# Changelog

All notable changes to this project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.5.0] - 2026-10-16

### Added

- Test coverage for all 8 intelligence atoms (Search, Summarize, Classify, Recommend, Analyze, Extract, Generate, Prompt)
- Test coverage for all 22 properties atoms (Status, Text, Number, Date, DateTime, Currency, Enum, Boolean, ID, Owner, Priority, CreatedAt, UpdatedAt, Score, Percent, Duration, Count, JSON, Address, AI, StartDate, EndDate, Email, Phone, URL)
- Test coverage for 3 previously untested actions atoms (Create/Update/Delete/View, Notify/Message/Assign, Search/Filter/Sort/Export)
- Test coverage for 3 previously untested interfaces atoms (Calendar, Chart, Detail)
- Test coverage for 3 previously untested rules atoms (Audit, Permission, Policy)
- `test:coverage` npm script for running tests with coverage reporting

### Changed

- Updated README Roadmap to reflect current 100% reference implementation coverage
- Bumped version to 0.5.0 in package.json and CITATION.cff

### Fixed

- Corrected the stale Roadmap section in README that contradicted the Status section

## [0.4.0] - 2026-08-21

### Added

- Initial release with 115 atoms across 6 families
- JSON Schema validator with dependency-free implementation
- Composition system prompt and plan schema
- Evaluation harness with baseline vs composition comparison
- Reference implementations for all 115 atoms
- CI pipeline with validation, coverage, linting, type-checking, and testing
