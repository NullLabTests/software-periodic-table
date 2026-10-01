# Evaluation Harness

Measures whether composition from the Software Periodic Table improves outcomes for coding agents relative to unconstrained generation.

## Quick Start

```bash
npx tsx eval/runner.ts
```

This runs all scenarios using a mock planner that emits ideal compositions. It validates:
- Atom counts and families covered
- Whether all referenced atoms exist in the ontology
- Acceptance criteria coverage
- Token estimates

Mock mode exercises the scoring pipeline against known-good plans. It does not
tell you anything about how a real model performs; that needs `LLM_API_KEY`.

Unit tests for the harness itself:

```bash
npm test
```

## Scenarios

Six scenarios are defined in `scenarios.ts`:

| ID | Title | Description |
|---|---|---|
| `task-board` | Task Board with Status and Assignees | Kanban task management with permissions |
| `crm-contacts` | Simple CRM Contact Management | Companies, contacts, activity logging, search |
| `invoice-list` | Invoice List with Filters and Export | Billing dashboard with CSV export |
| `user-role-management` | User and Role Management | Users, roles, teams, permissions |
| `notification-rules` | Notification Rules Engine | Event-driven notification system |
| `product-catalog` | Product Catalog with Search and Recommendations | Catalog with Grid/Table, search, AI recommendations |

Each scenario maps to atoms from the Periodic Table and includes acceptance criteria.

## Baseline vs. Composition Methodology

To conduct a real evaluation with an LLM:

### Baseline Strategy

1. Take each feature request (`scenario.featureRequest`) as-is.
2. Provide it to a coding agent with no reference to the Periodic Table.
3. Parse the agent's output to extract a `CompositionPlan` — identify which Objects, Properties, Actions, Interfaces, etc. the agent generated from scratch.
4. Measure tokens used, code quality, pass rate.

### Composition Strategy

1. Load the ontology (`ontology/periodic-table.json`) into the agent's context.
2. Inject the composition system prompt (`composer/prompt.ts`).
3. Optionally provide atom implementations as retrievable context.
4. Provide the same feature request.
5. Parse the output for atom references and measure the same metrics.

### Comparison

Use `metrics.ts` functions:

- `checkWithinTable()` — Did the plan stay within the curated set?
- `planOverlap()` — How similar are the baseline and composition plans?
- `estimateTokens()` — Estimated token savings.
- `summarizeResults()` — Per-scenario detail.
- `aggregateRepeats()` — Mean and standard deviation across repeated runs.

## Integrating with a Real LLM

`runner.ts` already does this. Set `LLM_API_KEY` and it switches from mock plans to
live model calls:

```bash
LLM_API_KEY=... npm run eval:llm
```

`OpenAIProvider` in `llm.ts` uses the Responses API by default and constrains the
plan with a strict JSON Schema, so the response is parseable without coercion.
It falls back to Chat Completions automatically for OpenAI-compatible gateways,
and retries `408`/`409`/`425`/`429`/`5xx` with exponential backoff.

Environment variables:

| Variable | Default | Purpose |
|---|---|---|
| `LLM_API_KEY` | unset | Enables live mode when set; unset means mock mode |
| `LLM_MODEL` | `gpt-4.1` | Model id |
| `LLM_BASE_URL` | `https://api.openai.com/v1` | Point at vLLM, Ollama, Together, Groq, etc. |
| `LLM_API` | auto | `responses` or `chat`; auto-detects from the base URL host |
| `EVAL_REPEATS` | `3` | Samples per scenario, for variance reporting |

To write a different provider, implement the `LLMProvider` interface: two methods,
`generateCompositionPlan()` and `generateBaseline()`.

## Metrics

| Metric | Description |
|---|---|
| Atom count | Number of distinct atoms referenced |
| Families covered | How many of the 6 families are used |
| Within table | Whether all atoms exist in the ontology |
| Token estimate | Rough token cost (plan + implementation) |
| Acceptance rate | Fraction of criteria that pass |
| Valid | All checks combined |

## On interpreting these numbers

Single-run LLM results are not measurements. The same prompt against the same
model will vary run to run, so a scenario that passes 3/3 times and one that
passes 1/3 times look identical if you only keep a single sample. `EVAL_REPEATS`
defaults to 3 for that reason, and the aggregate summary reports mean and
standard deviation alongside the valid count. Treat a scenario as reliable only
when `stable` is true, that is, when every repeat was valid.

`estimateTokens()` remains a character-count heuristic (~4 chars/token), not a
real tokenizer count. Comparisons between plans are meaningful; absolute token
numbers are not.
