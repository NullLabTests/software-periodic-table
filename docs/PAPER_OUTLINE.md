# Paper Outline: The Software Periodic Table

**Target venue:** arXiv (cs.SE / cs.AI)

**Working title:** *The Software Periodic Table: A Finite Ontology of Recurring Application Elements for Compositional Code Generation*

## Abstract (draft)

Large language models and coding agents are increasingly used to generate application software from natural-language descriptions. However, current approaches typically regenerate the same recurring patterns — user models, status machines, CRUD handlers, table views, permission checks — from scratch on every task. This is token-inefficient, introduces unnecessary variance, and makes verification harder. We present the Software Periodic Table, a curated ontology of 115 elemental software building blocks organized into six families: Objects, Properties, Actions, Interfaces, Intelligence, and Rules. We provide typed reference implementations, a composition system prompt for LLMs, and an evaluation harness for measuring token efficiency and composition fidelity. In a suite of six realistic feature-request scenarios, we characterize the atom-usage patterns and estimated token costs of a composition-based approach, and we describe a methodology for systematic comparison against unconstrained generation.

## Structure

### 1. Introduction

- The problem: LLMs regenerate known patterns wastefully
- The thesis: a finite set of curated atoms + composition is better
- Contribution summary (see README)
- Paper roadmap

### 2. The Software Periodic Table

- Design principles (finite, stable, composable, agent-first)
- The six families and their ranges
- Element schema: id, symbol, name, family, description
- Ontology as single source of truth (`periodic-table.json`)
- Comparison to chemical periodic table as metaphor

### 3. Composition Model

- How atoms are composed: Objects + Properties → data model; Interfaces + Actions → presentation and behavior; Rules + Intelligence → governance and cognition
- System prompt design (agent selects, wires, configures; does not reinvent)
- Plan schema (structured output format)
- Retrieval patterns for LLM context

### 4. Reference Implementations

- TypeScript as reference language
- Core types (`Atom`, `ObjectAtom`, `ActionRequest`, `InterfaceSpec`, `Rule`)
- Implementation walkthrough: Task + User + Kanban + Table (the task-board example)
- Implementation status across all 115 elements

### 5. Evaluation

- Six scenarios: task board, CRM contacts, invoice list, user/role management, notification rules, product catalog
- Metrics: atom usage, families covered, within-table rate, token estimates, acceptance criteria
- Baseline vs. composition methodology
- Mock evaluation results
- Plan for real LLM evaluation

### 6. Related Work

- Component-based software engineering / software product lines
- Atomic design (Frost) and design systems
- Library learning / program abstraction
- Coding agents (Devin, Cursor, Copilot, open-code, etc.)
- Ontologies in software engineering

### 7. Limitations and Future Work

- Current implementation coverage (subset of 115)
- Domain-specific elements intentionally excluded
- Need for empirical LLM evaluation
- Language ports (Python, Rust, Go)
- Domain packs (CRM, healthcare, fintech, etc.)

### 8. Conclusion

- Restate thesis and contributions
- Call for community participation
- Repository location

## Appendices

### A. Full Periodic Table

All 115 elements with ids, symbols, names, families, and descriptions.

### B. Scenario Details

Full feature-request text and expected atoms for each evaluation scenario.

### C. Example Output

Complete run of the task-board example with explanation.
