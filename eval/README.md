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
- `summarizeResults()` — Aggregate across all scenarios.

## Integrating with a Real LLM

Replace `mockPlanForScenario` in `runner.ts` with a function that calls your LLM provider. Example:

```typescript
async function callLLM(prompt: string): Promise<string> {
  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "gpt-4",
      messages: [{ role: "system", content: SYSTEM_PROMPT }, { role: "user", content: prompt }],
    }),
  });
  const data = await response.json();
  return data.choices[0].message.content;
}
```

Then parse the response into a `CompositionPlan` and pass it to the same metric functions.

## Metrics

| Metric | Description |
|---|---|
| Atom count | Number of distinct atoms referenced |
| Families covered | How many of the 6 families are used |
| Within table | Whether all atoms exist in the ontology |
| Token estimate | Rough token cost (plan + implementation) |
| Acceptance rate | Fraction of criteria that pass |
| Valid | All checks combined |
