# Evaluation: Does the Periodic Table Actually Help?

We ran a controlled experiment comparing two strategies for generating software plans from the same 6 feature requests:

- **Baseline:** An LLM with general software engineering knowledge but no knowledge of the Periodic Table.
- **Composition:** The same LLM given the ontology and composition system prompt.

Both used the same model to ensure the only variable was access to the Periodic Table.

## Results

| Scenario | Baseline tokens | Composition tokens | Savings | Within table |
|---|---|---|---|---|
| Task Board | 126 | 91 | **-28%** | ✅ |
| CRM Contacts | 143 | 87 | **-39%** | ✅ |
| Invoice Dashboard | 148 | 91 | **-39%** | ✅ |
| User & Role Management | 142 | 75 | **-47%** | ✅ |
| Notification Rules | 152 | 88 | **-42%** | ✅ |
| Product Catalog | 143 | 89 | **-38%** | ✅ |
| **Total** | **854** | **521** | **-39%** | **6/6** |

## What This Means

1. **Every composition plan stayed within the curated ontology.** The baseline invented custom names for every component (e.g., "KanbanBoard", "AuthRequired", "RoleHierarchy"). The composition agent used existing atom symbols (Kb, Pn, Ro) — no drift, no reinvention.

2. **~40% fewer tokens to express the same plan.** By referencing proven building blocks instead of re-describing them, the composition agent produces more concise output. Over many generations, this compounds into meaningful cost and latency savings.

3. **Consistent across domains.** The pattern held across project management, CRM, billing, auth, notifications, and e-commerce — suggesting the ontology generalizes well.

## Why This Matters for LLM-Generated Code

Every token saved by referencing an existing atom is a token not spent on regenerating an equivalent pattern that risks subtle drift. The composition approach transforms generation from *write everything from scratch* to *select, configure, and wire proven elements* — a fundamentally smaller search space that produces more verifiable output.

## Running It Yourself

```bash
# Mock eval (no LLM needed — checks expected atoms)
npx tsx eval/runner.ts

# LLM eval (requires API key)
OPENAI_API_KEY=sk-... npx tsx eval/runner.ts

# Sub-agent eval (no API key — uses in-session agents)
# See eval/agent-eval.ts for instructions
```
