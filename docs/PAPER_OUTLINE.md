# Paper Outline: The Software Periodic Table

**Target venue:** arXiv (cs.SE / cs.AI)

**Working title:** *The Software Periodic Table: A Finite Ontology of Recurring Application Elements for Compositional Code Generation*

## Abstract (draft)

Large language models and coding agents are increasingly used to generate application software from natural-language descriptions. However, current approaches typically regenerate the same recurring patterns — user models, status machines, CRUD handlers, table views, permission checks — from scratch on every task. This is token-inefficient, introduces unnecessary variance, and makes verification harder. We present the Software Periodic Table, a curated ontology of 115 elemental software building blocks organized into six families: Objects, Properties, Actions, Interfaces, Intelligence, and Rules. We provide typed reference implementations with tests, a composition system prompt for LLMs, and an evaluation harness that scores plans against per-scenario ground truth and on acceptance criteria that name the atoms satisfying them. Our contribution is the ontology and a reproducible evaluation methodology: we report no measured claim that composition beats generation, and we document a token-saving figure we initially reported and then withdrew once we established that it primarily measured abbreviation length rather than plan content.

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
- Primary metrics: ground-truth recall and precision, and acceptance criteria that name the atoms satisfying them
- Baseline vs. composition methodology: same model, same feature request, differing only in whether the table is shown; the baseline's descriptive names are resolved to symbols within their own family
- Controlling for notation: no character or token count is reported at all. A `characters / 4` estimate was checked against a real tokenizer and came out −21% on symbol plans and +9% on name-expanded plans, so the apparent notation saving (1.36×) is not distinguishable from zero (0.99×)
- **Outstanding: no live-model results yet.** A preliminary token-saving figure was withdrawn once it became clear the metric mostly measured abbreviation length
- Plan for the real evaluation, and what a supporting result would have to show

### 6. Related Work

- Component-based software engineering / software product lines
- Atomic design (Frost) and design systems
- Library learning / program abstraction
- Coding agents (Devin, Cursor, Copilot, open-code, etc.)
- Ontologies in software engineering

### 7. Limitations and Future Work

- Reference implementations cover all 115 elements; they are contract-level shapes with pure materialization functions, not a wired runtime
- No live-model evaluation results yet; the harness is verified but unrun against a model
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
