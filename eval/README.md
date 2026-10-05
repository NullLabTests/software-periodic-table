# Evaluation Harness

Measures whether composing from the Software Periodic Table changes what an
agent produces, relative to unconstrained generation.

**Read [`docs/EVAL_RESULTS.md`](../docs/EVAL_RESULTS.md) first.** It explains why
the previously published token-savings figure was withdrawn, and which metrics
are worth trusting.

## Quick Start

```bash
npm run eval                    # self-check, no API key needed
OPENAI_API_KEY=sk-... npm run eval   # real baseline vs composition
```

With no key, the harness replays each scenario's own ground-truth plan. That is a
check of the metrics and the ontology, not a measurement of model behaviour:
every plan is within the table by construction, so recall is 1.0 and acceptance
passes by definition. The output says so on every run.

## Scenarios

Six scenarios in `scenarios.ts`, each with a feature request, a ground-truth atom
set, and acceptance criteria that name the atoms satisfying them.

| ID | Title | Ground-truth atoms |
|---|---|---|
| `task-board` | Task Board with Status and Assignees | 12 |
| `crm-contacts` | Simple CRM Contact Management | 15 |
| `invoice-list` | Invoice List with Filters and Export | 14 |
| `user-role-management` | User and Role Management | 13 |
| `notification-rules` | Notification Rules Engine | 14 |
| `product-catalog` | Product Catalog with Search and Recommendations | 15 |

`test/metrics.test.ts` enforces that the criteria and the ground truth stay
consistent: every criterion's symbols must exist, every criterion must be
satisfiable by the ground truth, and every ground-truth atom must be required by
some criterion.

## Methodology

Both arms get the same model, the same feature request, and are asked for the same
two artefacts: a component breakdown and the code that realises it. The only
difference is what they are told.

| | Baseline | Composition |
|---|---|---|
| System prompt | plain software engineering instruction | composition prompt |
| Ontology | not shown | full table with symbols |
| Naming | its own descriptive names | required to use table symbols |

The baseline's names are then resolved to symbols **within their own family**, so
a baseline component that happens to coincide with an ontology atom earns the
credit. Without the family qualifier the lookup is ambiguous — `Email` is both an
object and a property — and components get silently reassigned to whichever
family was declared last.

## Metrics

| Metric | Description | Trustworthy? |
|---|---|---|
| `fidelity.recall` | Ground-truth atoms found, over all ground-truth atoms | Yes — primary |
| `fidelity.precision` | Ground-truth atoms in the plan, over all atoms used | Yes |
| `acceptanceChecks` | Criteria naming the atoms that satisfy them | Yes |
| `unimplementedAtoms` | Referenced atoms with no implementation in `atoms/` | Yes |
| `nameNormalizedTotalTokens` | Tokens with both arms expanded to full names | Yes |
| `totalTokens` | Tokens in each arm's own notation | Upper bound only |
| `withinTable` | Every symbol exists in the ontology | Not a comparison |
| `planOverlap` | Symbol overlap between two plans | Yes, after the `notes` fix |

### Why raw token counts are an upper bound

A plan written in 2-character symbols is shorter than the same plan written in
full names, regardless of whether composition helped. Every token figure is
therefore also reported with both sides expanded to names, which measures the plan
rather than the notation. See `docs/EVAL_RESULTS.md`.

### Why `withinTable` is not a result

The baseline was never shown the table, so it cannot stay inside it. Reporting
that as a baseline failure measures compliance with an instruction only one arm
received.

## Comparing two agents

```bash
npx tsx eval/agent-eval.ts baseline      # print the baseline agent prompt
npx tsx eval/agent-eval.ts composition   # print the composition agent prompt
npx tsx eval/agent-eval.ts compare       # score both saved result files
```

Each agent writes `baseline-results.json` or `composition-results.json` at the
repository root; override with `SPT_BASELINE_OUT` / `SPT_COMPOSITION_OUT`. Both
are gitignored. Useful for comparing
different agents, or for running an experiment that should not cost API calls.

## Configuration

| Variable | Purpose |
|---|---|
| `LLM_API_KEY` / `OPENAI_API_KEY` | Enables the LLM path. Both are accepted so the documented command works. |
| `LLM_MODEL` / `OPENAI_MODEL` | Model id. Defaults to `gpt-4o`. |
| `LLM_BASE_URL` / `OPENAI_BASE_URL` | API root, for any OpenAI-compatible endpoint. |

## Files

| File | Role |
|---|---|
| `runner.ts` | Entry point. API-backed comparison, or the mock self-check. |
| `llm.ts` | `LLMProvider` interface and an OpenAI-compatible implementation. |
| `scenarios.ts` | Feature requests, ground truth, acceptance criteria. |
| `metrics.ts` | Pure scoring functions. No I/O, fully unit-tested. |
| `agent-eval.ts` | Prompt generation and scoring for sub-agent comparisons. |
