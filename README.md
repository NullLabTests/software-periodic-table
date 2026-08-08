# Software Periodic Table

**A finite ontology of recurring software elements — and a composition framework for building applications with LLMs and coding agents.**

> The central observation is simple: most application software is not invented from scratch. It is composed from a recurring set of nouns, attributes, verbs, views, AI primitives, and automation rules. Regenerating these elements on every generation pass wastes tokens, introduces drift, and produces systems that are harder to verify. A curated, retrievable library of proven atoms turns generation into selection and wiring — a fundamentally smaller and more reliable search space.

This repository formalizes that observation into a concrete artifact:

1. A machine-readable **ontology** of 115 software elements (the Periodic Table), organized into six families.
2. Typed **reference implementations** in strict TypeScript.
3. A **composition model** with system prompts and retrieval patterns designed for modern coding agents.
4. An **evaluation harness** for measuring token efficiency, composition fidelity, and correctness.

## Contributions

- **A finite-element ontology for application software.** We identify 115 elements across six families (Objects, Properties, Actions, Interfaces, Intelligence, Rules) that suffice to express the vast majority of business-application features.
- **A composition-over-generation thesis.** We argue and provide a framework to measure that selecting and wiring curated atoms is superior to regenerating equivalent patterns for each task.
- **An agent-ready library.** Atoms expose typed interfaces and metadata that agents can reason about, retrieve, and compose. The system prompt and plan schema are included.
- **A reproducible evaluation methodology.** The harness defines baseline vs. composition comparison with structural metrics and atom-usage tracking.

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
├── ontology/                  # Canonical definitions (JSON, single source of truth)
│   └── periodic-table.json    # 115 elements with metadata
├── atoms/                     # Typed reference implementations
│   ├── core.ts                # Shared types: Atom, ObjectAtom, ActionRequest, etc.
│   ├── objects/               # Object atoms: user.ts, task.ts
│   ├── properties/            # Property atoms: status.ts
│   ├── actions/               # Action atoms: crud.ts
│   ├── interfaces/            # Interface atoms: table.ts, kanban.ts
│   ├── intelligence/          # Intelligence atoms (stubs for extension)
│   └── rules/                 # Rule atoms: permission.ts
├── composer/                  # Composition layer & agent prompts
│   └── prompt.ts              # System prompt + plan schema
├── examples/                  # End-to-end compositions
│   └── task-board.ts          # Runnable example: Task + User + Kanban + Table
├── eval/                      # Evaluation harness
│   ├── runner.ts              # Benchmark runner
│   ├── scenarios.ts           # Feature-request scenarios
│   ├── metrics.ts             # Token / structure measurement
│   └── README.md              # How to run & interpret eval
├── docs/                      # Design notes, agent guide, paper outline
│   ├── DESIGN.md              # Rationale and design decisions
│   ├── AGENT_USAGE.md         # How to use with coding agents
│   ├── CONTRIBUTING.md        # Guidelines for extending the table
│   └── PAPER_OUTLINE.md       # Draft outline for an arXiv submission
├── scripts/                   # Utility scripts
│   ├── validate-ontology.ts   # Schema + consistency checks
│   └── coverage.ts            # Atom implementation coverage report
├── CITATION.cff               # Citation metadata
├── LICENSE                    # MIT
├── package.json
├── tsconfig.json
└── README.md
```

## Quick Start

```bash
# Install dependencies
npm install

# Inspect the ontology (115 elements)
npx tsx scripts/validate-ontology.ts

# Report reference-implementation coverage (44/115 atoms implemented)
npx tsx scripts/coverage.ts

# Run composition examples
npx tsx examples/task-board.ts          # Task + Kanban board
npx tsx examples/crm-contacts.ts        # CRM contact management
npx tsx examples/product-catalog.ts     # Product catalog + AI Search/Recommend
npx tsx examples/invoice-dashboard.ts   # Invoice dashboard + Filter/Export/Chart

# Run the evaluation harness (mock mode)
npx tsx eval/runner.ts

# Run with real LLM (requires OPENAI_API_KEY)
OPENAI_API_KEY=sk-... npx tsx eval/runner.ts
```

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
5. **Measurable.** Token usage, composition fidelity, and correctness are first-class evaluation criteria. The `eval/` harness captures all three.

## Status

The ontology (115 elements) is stable. Reference implementations exist for 44 atoms (38%) across all six families: 100% of Intelligence, 71% of Rules, 44% of Actions, 40% of Interfaces, and ~25% of Objects and Properties (run `npm run coverage` for the live report). The composition system prompt, examples, and evaluation harness are functional. Remaining work includes expanding reference coverage, implementing actual LLM-based evaluation runs, and collecting empirical results for publication.

## Limitations

- The current reference implementations cover only a subset of the 115 elements. Elements without implementations have precise descriptions in the ontology but lack TypeScript stubs.
- The evaluation harness includes mock scoring by default. Real LLM integration requires provider API keys and is left as a configuration step.
- Domain-specific concepts (insurance claims, retail SKUs, etc.) are intentionally excluded from the core table. They belong in optional domain packs.

## Roadmap

- **Near term:** Expand reference implementations to cover all 115 elements. Add Form, Chart, Calendar, and intelligence atoms.
- **Medium term:** Conduct systematic LLM evaluation (baseline vs. composition) and publish results. Collect community-contributed atoms through the contribution process.
- **Long term:** Port ontology to additional languages (Python, Rust, Go). Develop domain packs for common verticals.

## Contributing

See `docs/CONTRIBUTING.md`. New atoms must:

- Fit an existing family or justify a new one with strong evidence.
- Provide a clear interface.
- Include at least one reference implementation or precise specification.
- Prefer composition of existing atoms over new primitives.

## Citation

If you use this project in research, please cite it using the metadata in `CITATION.cff` or the DOI once published.

## License

MIT. See `LICENSE`.
