# How to Use the Software Periodic Table with Coding Agents

This document describes two patterns for using the Periodic Table with LLM-based coding agents.

## Pattern 1: Retrieval-Augmented Generation (Recommended)

### Setup

1. Load `ontology/periodic-table.json` into the agent's accessible context (vector store, file system, or tool).
2. Provide the composition system prompt from `composer/prompt.ts` as part of the system instructions.
3. Ensure the agent has read-access to the `atoms/` directory for reference implementations.

### Workflow

When the agent receives a feature request, it should:

1. **Identify primary Objects** — Which nouns/entities does the feature need? (e.g., Task, User, Invoice)
2. **Select Properties** — Reuse Status, Owner, CreatedAt, Priority, etc. from the table.
3. **Choose Actions** — CRUD, Assign, Notify, Search, etc.
4. **Pick Interfaces** — Table, Kanban, Form, Chart, etc.
5. **Add Intelligence or Rules** — Search, Classify, Permission, Trigger, etc. if needed.
6. **Emit a composition plan** — A structured plan referencing atom names or symbols.
7. **Generate minimal code** — Wire the atoms together rather than reimplementing them.

### Recommended System Prompt

See `composer/prompt.ts` for the full `COMPOSITION_SYSTEM_PROMPT` and `COMPOSITION_PLAN_SCHEMA`. Include both in the agent's system prompt.

### Example

```
User: "Build a task board with assignees and status tracking."

Agent (composition mode):
1. Objects: Task (Tk), User (Us)
2. Properties: Status (Ss), Priority (Py), Owner (Ow), CreatedAt (Ca), UpdatedAt (Ua)
3. Actions: Create (Cr), Update (Up), View (Vw), Assign (As)
4. Interfaces: Kanban (Kb), Table (Tb)
5. Rules: Permission (Pn)

[Agent then generates minimal wiring code]
```

## Symbols Are Not Always Unique Across Families

Five names each name an element in two families. The ontology resolves this with
distinct symbols, so always check which one you mean:

| Name | Object | Property | Action | Intelligence | Rule |
|---|---|---|---|---|---|
| Email | `Em` | `Ea` | | | |
| Message | `Ms` | | `Mg` | | |
| Search | | | `Se` | `Sr` | |
| Trigger | | | `Tr` | | `Ti` |
| Schedule | | | `Sc` | | `Sa` |

A plan's family buckets carry this information, so resolve a name *within* its
family. `eval/metrics.ts` exposes `normalizePlanNames()` for this; a bare
name-to-symbol lookup silently picks whichever family was declared last.

## Pattern 2: Direct Prompt Injection

If retrieval infrastructure is not available, paste the contents of `composer/prompt.ts` directly into the agent's system prompt. Reference the ontology as a structured list:

```
Available software atoms (symbol: name - description):
- Us: User - Authenticated system user
- Tk: Task - Unit of work
- Ss: Status - Lifecycle or state value
- Cr: Create - Instantiate a new object
- Up: Update - Modify an existing object
- Kb: Kanban - Column-based status board
- Tb: Table - Structured rows and columns
- Pn: Permission - Access control statement
...
```

The agent can then reason about which atoms to select and wire.

## Tools Integration

### For open-code / Claude Code

Add these to the agent's configuration:

```json
{
  "tools": [
    {
      "name": "read-periodic-table",
      "description": "Read the Software Periodic Table ontology (all 115 elements)",
      "command": "cat ontology/periodic-table.json"
    },
    {
      "name": "read-composition-prompt",
      "description": "Read the composition system prompt",
      "command": "cat composer/prompt.ts"
    }
  ]
}
```

### For Cursor / VS Code with agent mode

Place the repository in the project workspace. The agent will automatically index and retrieve relevant files. Include `@ontology/periodic-table.json` in a relevant context file.

### For custom agents

Load `ontology/periodic-table.json` as a retrievable document chunk. Each element can be indexed as:
- `element:Us` -> User object
- `element:Ss` -> Status property
- `element:Cr` -> Create action
- etc.

## Recommended Retrieval Patterns

### Ontology-first retrieval

```
Query: "I need to build a feature with users and tasks"
Retrieved atoms: User (Us), Task (Tk), Status (Ss), Priority (Py), Owner (Ow)
```

### Interface-driven retrieval

```
Query: "I need a Kanban board view"
Retrieved atoms: Kanban (Kb), Table (Tb), Board (Bd), Card (Cd)
```

### Action-driven retrieval

```
Query: "Users need to be able to notify each other"
Retrieved atoms: Notify (No), Message (Mg), Trigger (Tr), Email (Em)
```

### Rule-driven retrieval

```
Query: "Approve an invoice only if the amount is under $10k"
Retrieved atoms: Permission (Pn), Condition (Cv), Approve (Ap), Policy (Po)
```

## Validation

After the agent emits a composition, validate it against the ontology:

- Do all referenced symbols exist in `periodic-table.json`?
- Are the combinations meaningful (Objects have Properties, Interfaces display Objects, Actions operate on Objects)?
- Is the plan minimal (no unused atoms, no reinvention)?

The `eval/metrics.ts` module provides functions for these checks.
