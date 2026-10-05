# Software Periodic Table

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![TypeScript](https://img.shields.io/badge/TypeScript-strict-blue.svg)](tsconfig.json)
[![Atoms](https://img.shields.io/badge/atoms-115-6f42c1.svg)](ontology/periodic-table.json)
[![CI](https://github.com/NullLabTests/software-periodic-table/actions/workflows/ci.yml/badge.svg)](https://github.com/NullLabTests/software-periodic-table/actions/workflows/ci.yml)
[![Tests](https://img.shields.io/badge/tests-node--test-informational.svg)](test/)

**A finite ontology of recurring software elements — and a composition framework for building applications with LLMs and coding agents.**

> The central observation is simple: most application software is not invented from scratch. It is composed from a recurring set of nouns, attributes, verbs, views, AI primitives, and automation rules. Regenerating these elements on every generation pass wastes tokens, introduces drift, and produces systems that are harder to verify. A curated, retrievable library of proven atoms turns generation into selection and wiring — a fundamentally smaller and more reliable search space.

This repository formalizes that observation into a concrete artifact:

1. A machine-readable **ontology** of 115 software elements (the Periodic Table), organized into six families, with a JSON Schema and a validator that enforces it.
2. Typed **reference implementations** in strict TypeScript, with behaviour tests.
3. A **composition model** with system prompts and retrieval patterns designed for modern coding agents.
4. An **evaluation harness** for measuring composition fidelity and correctness against a baseline.

> **On empirical claims:** this project makes no measured claim that composition
> beats generation. An earlier version reported a 39% token saving; that figure is
> withdrawn, and the harness no longer reports any token metric. Checked against a
> real tokenizer, the `characters / 4` estimate it relied on was −21% on symbol
> plans and +9% on name-expanded plans, so the apparent notation saving was an
> artifact of the estimator. The evaluation methodology is the contribution here,
> and running it is the next step. See
> [`docs/EVAL_RESULTS.md`](docs/EVAL_RESULTS.md).

## Contributions

- **A finite-element ontology for application software.** We identify 115 elements across six families (Objects, Properties, Actions, Interfaces, Intelligence, Rules) that suffice to express the vast majority of business-application features.
- **A composition-over-generation framework.** A curated, agent-oriented library plus the prompts and plan schema for selecting and wiring from it. The thesis is argued and instrumented; it is not yet supported by a published measurement.
- **A verified data artifact.** Every invariant the ontology is supposed to hold — unique ids and symbols, ids inside their family range, a fully allocated id space, resolvable composition references — is enforced by the validator and covered by tests, so a table an agent can trust is a table a machine checks.
- **A reproducible evaluation methodology.** Baseline vs. composition scored on ground-truth recall and on acceptance criteria that name the atoms satisfying them, with notation length controlled for.

## The Six Families

| Family | Role | Examples |
|---|---|---|
| **Objects** | Nouns / entities | User, Task, Invoice, Project, Subscription, Contact |
| **Properties** | Attributes / fields | Status, Date, Currency, Priority, Owner, Enum, AI |
| **Actions** | Verbs / operations | Create, Update, Assign, Notify, Approve, Filter, Export |
| **Interfaces** | Views / presentation | Table, Kanban, Form, Chart, Calendar, Detail, Feed |
| **Intelligence** | AI / cognitive primitives | Search, Summarize, Classify, Recommend, Analyze |
| **Rules** | Automation / governance | Permission, Trigger, Condition, Audit, Policy |

Each element in the ontology has a unique numeric `id`, a two-character `symbol`, a human-readable `name`, and a short `description`. The full table is the single source of truth at `ontology/periodic-table.json`.

## How the Table Is Structured

The 115 elements are partitioned by family with reserved ranges:

- **Objects (1–35):** Core domain nouns. User, Task, Invoice, Project, Contact, Product, etc.
- **Properties (36–60):** Typed fields. Status, Date, Currency, Owner, Priority, AI, etc.
- **Actions (61–85):** Operations. Create, Update, Delete, Assign, Notify, Approve, etc.
- **Interfaces (86–100):** Views. Table, Kanban, Form, Chart, Calendar, Card, Detail, etc.
- **Intelligence (101–108):** Model-backed capabilities. Search, Summarize, Classify, Generate, etc.
- **Rules (109–115):** Governance. Permission, Policy, Trigger, Condition, Audit, etc.

New elements are added only when a concept is both widely recurring and not expressible by composition of existing atoms.

## Repository Structure

```
software-periodic-table/
├── ontology/                       # Canonical definitions (JSON, single source of truth)
│   ├── periodic-table.json         # 115 elements with metadata
│   └── periodic-table.schema.json  # JSON Schema, enforced by the validator
├── atoms/                          # Typed reference implementations
│   ├── core.ts                     # Shared types: Atom, ObjectAtom, ActionRequest, etc.
│   ├── objects/                    # Object atoms: user.ts, task.ts
│   ├── properties/                 # Property atoms: status.ts
│   ├── actions/                    # Action atoms: crud.ts, trigger.ts
│   ├── interfaces/                 # Interface atoms: table.ts, kanban.ts, feed.ts
│   ├── intelligence/               # Intelligence atoms: model-backed primitives
│   └── rules/                      # Rule atoms: permission.ts, trigger.ts, action.ts
├── src/                            # Shared infrastructure
│   ├── ontology.ts                 # Loader, name/symbol indexes, family ranges
│   └── jsonschema.ts               # Dependency-free JSON Schema subset validator
├── composer/                       # Composition layer & agent prompts
│   └── prompt.ts                   # System prompt + plan schema
├── examples/                       # End-to-end compositions
│   ├── task-board.ts               # Task + User + Kanban + Table
│   ├── crm-contacts.ts
│   ├── product-catalog.ts
│   └── invoice-dashboard.ts
├── eval/                           # Evaluation harness
│   ├── runner.ts                   # Entry point: baseline vs composition
│   ├── llm.ts                      # LLMProvider interface + OpenAI implementation
│   ├── scenarios.ts                # Feature requests, ground truth, acceptance criteria
│   ├── metrics.ts                  # Fidelity, acceptance and plan diagnostics
│   ├── agent-eval.ts               # Sub-agent variant of the same comparison
│   └── README.md                   # How to run & interpret eval
├── test/                           # node:test suite — ontology, schema, metrics, atoms
├── docs/
│   ├── DESIGN.md                   # Rationale and design decisions
│   ├── AGENT_USAGE.md              # How to use with coding agents
│   ├── EVAL_RESULTS.md             # What was measured, and what was withdrawn
│   ├── CONTRIBUTING.md             # Guidelines for extending the table
│   └── PAPER_OUTLINE.md            # Draft outline for an arXiv submission
├── scripts/
│   ├── validate-ontology.ts        # Schema + consistency checks
│   ├── coverage.ts                 # Coverage report + atoms/ontology cross-check
│   └── search.ts                   # Query the table: npm run search -- <term>
├── CITATION.cff                    # Citation metadata
├── LICENSE                         # MIT
├── package.json
├── tsconfig.json
└── README.md
```

## Quick Start

```bash
# Install dependencies
npm ci

# Validate the ontology: JSON Schema + internal consistency
npm run validate

# Reference-implementation coverage, with a cross-check against atoms/
npm run coverage

# Type-check, lint, and run the test suite
npm run check
npm run lint
npm test

# Run the composition examples
npm run example          # Task + Kanban board
npm run example:crm      # CRM contact management
npm run example:product  # Product catalog + AI Search/Recommend
npm run example:invoice  # Invoice dashboard + Filter/Export/Chart

# Everything CI runs, in one command
npm run ci

# Evaluation harness self-check (no API key needed)
npm run eval

# Real baseline vs composition (requires OPENAI_API_KEY or LLM_API_KEY)
OPENAI_API_KEY=sk-... npm run eval
```

## Tests

The ontology is a data artifact that agents consume, so its invariants are
enforced by tests rather than by convention:

- `test/ontology.test.ts` — the shipped table is internally consistent, and the
  validator provably catches duplicate ids, duplicate symbols, out-of-range ids,
  unknown families, unresolvable `composesWith` references, and unallocated ids.
- `test/jsonschema.test.ts` — the in-repo schema validator, including the
  `if`/`then`/`const` machinery the per-family id bounds depend on.
- `test/metrics.test.ts` — regression tests for the evaluation bugs fixed in
  v0.5.0 (the `notes` characters in `planOverlap`, the acceptance fall-through,
  the cross-family name collision) plus consistency between each scenario's
  acceptance criteria and its ground truth.
- `test/atoms.test.ts` — behaviour of the atom implementations.

Run with `npm test`. No test framework dependency; `node:test` and `tsx` only.

## Ontology Validation

`scripts/validate-ontology.ts` is the schema and consistency gate for `ontology/periodic-table.json`, and runs in CI. It resolves `composesWith` references against the full symbol table, so an element may be composed with any other element regardless of declaration order.

| Severity | Meaning | Examples |
|---|---|---|
| **ERROR** | Fails the run with exit code 1 | duplicate `id` or `symbol`, unknown family, `id` outside its family range, family range mismatch, `composesWith` pointing at an undefined symbol |
| **WARN** | Suspicious, but does not fail | duplicate `name` *within* a family, self-composition, repeated entry in one `composesWith` list, unallocated `id` in a family range |
| **INFO** | Intentional, purely informational | a `name` reused across *different* families (e.g. an Email object and an Email property) |

## How to Use with Coding Agents

Coding agents and LLMs are the primary consumers of this library. Two usage patterns are supported:

**1. Retrieval-augmented generation (recommended).** Load `ontology/periodic-table.json` and relevant atom files into the agent's context or vector store. Include the composition system prompt from `composer/prompt.ts`. When the agent receives a feature request, it retrieves relevant atoms and emits a composition plan + minimal code.

**2. Direct prompt injection.** Paste the composition system prompt into the agent's system prompt. Reference the ontology as a structured description of available building blocks. The agent will reason about selection and wiring on its own.

See `docs/AGENT_USAGE.md` for a detailed walkthrough of both patterns, including recommended prompts, retrieval strategies, and worked examples.

## Design Principles

1. **Finite and stable.** The table grows slowly and deliberately. Prefer composition over new atoms.
2. **Composable by construction.** Every atom declares clear interfaces, inputs, and side-effect boundaries.
3. **Implementation-agnostic at the ontology level.** The table describes *what*, not *how*. Reference TypeScript implementations exist; ports are welcome.
4. **Agent-first.** Retrieval, typing, and prompting are first-class concerns. The library is designed to be consumed by code rather than humans.
5. **Measurable.** Composition fidelity and correctness are first-class evaluation criteria, scored against a per-scenario ground truth. The `eval/` harness measures both.

## Status

The ontology (115 elements) is stable. **Every element has a tested reference
implementation — 115 of 115 (100%)**, across all six families (run `npm run
coverage` for the live report). `test/ontology.test.ts` fails if any atom loses its
implementation, because a symbol with no implementation is a hole in the claim that
the table is composable end to end. The composition system prompt, examples, and
evaluation harness are functional and unit-tested.

**No empirical claim is made yet.** An earlier version of this README reported a
39% token saving from composition. That figure is withdrawn and the metric is
gone. It compared plans written in 2-character symbols against plans written in
full descriptive names, so most of the measured saving was the cost of the
abbreviation; a real tokenizer then showed the notation advantage to be
approximately zero (0.99×, where the character estimate claimed 1.36×). The harness
scores ground-truth recall and acceptance criteria, and no LLM run has been
published. See [`docs/EVAL_RESULTS.md`](docs/EVAL_RESULTS.md).

Two experimental-design problems are documented and unsolved: the baseline prompt
leaks the ontology's six-family taxonomy, and some ground truth requires atoms the
feature request never mentions. Both would need settling before a live run meant
anything.

Remaining work: run and publish a corrected LLM evaluation, rework the ground truth
against the feature requests, and collect empirical results.

## Limitations

- The reference implementations are contract-level: they define a typed shape and
  a pure materialization function, not a wired-up runtime. Adopting an atom means
  executing it.
- The evaluation harness is reproducible but has not been run against a live
  model, so it demonstrates the methodology rather than a result.
- No cost or token metric is reported. The `characters / 4` estimate it replaced
  was −21% on symbol plans and +9% on name-expanded plans when checked against a
  real tokenizer, so it could not be corrected by a constant factor and was
  removed instead of recalibrated.
- The evaluation ground truth is not yet defensible: some criteria require atoms
  the feature request never names, and `notification-rules` requires "Trigger" in
  two families at once. Baseline recall is currently understated for reasons
  unrelated to the ontology.
- Domain-specific concepts (insurance claims, retail SKUs, etc.) are intentionally
  excluded from the core table. They belong in optional domain packs.
- Five names each identify elements in two families (`Email`, `Message`,
  `Search`, `Trigger`, `Schedule`). The symbols are distinct, but a bare
  name-to-symbol lookup is ambiguous — see the table in
  [`docs/AGENT_USAGE.md`](docs/AGENT_USAGE.md).

## Roadmap

- **Near term:** Expand reference implementations to cover all 115 elements. Remaining families: Actions (13 missing), Interfaces (7 missing), Rules (1 missing).
- **Medium term:** Run a corrected LLM evaluation, publish the results with the
  raw JSON, and collect community-contributed atoms.
- **Long term:** Port the ontology to additional languages (Python, Rust, Go).
  Develop domain packs for common verticals.

## Contributing

Contributions are welcome, and the ontology is the part most people want to
change. See [`docs/CONTRIBUTING.md`](docs/CONTRIBUTING.md) for the full process.

A new element is only added if it is **widely recurring** and **not expressible
by composing existing atoms**. Most rejected proposals fail the second test, so
before opening one, check whether `composesWith` already covers the concept:

```bash
npm run search -- subscription
npm run search -- message --family actions   # disambiguate across families
npm run search -- --symbol Tk
```

There are issue templates for [bugs](.github/ISSUE_TEMPLATE/bug_report.yml) and
[ontology proposals](.github/ISSUE_TEMPLATE/ontology_proposal.yml), and a pull
request checklist that keeps documentation and coverage numbers in sync with the
code.

Before opening a pull request:

```bash
npm run ci
```

That runs the validator, the coverage report, lint, type-checking across all
three tsconfig projects, the test suite, a build, and every example.

### Governance

- [Code of Conduct](CODE_OF_CONDUCT.md)
- [Security Policy](SECURITY.md) — report vulnerabilities privately

## Citation

If you use this project in research, please cite it using the metadata in `CITATION.cff` or the DOI once published.

## License

MIT. See `LICENSE`.
