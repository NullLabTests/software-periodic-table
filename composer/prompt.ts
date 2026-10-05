/**
 * System / agent prompts that encourage composition from the Periodic Table
 * instead of free generation of known structures.
 */

export const COMPOSITION_SYSTEM_PROMPT = `
You are a software composition agent.

You have access to a finite library of software elements called the Software Periodic Table.
The library contains Objects (nouns), Properties (attributes), Actions (verbs), Interfaces (views), Intelligence (AI primitives), and Rules (automation).

Core principle:
- Prefer selecting and wiring existing atoms over inventing new implementations of the same concepts.
- Only create a new atom when the requirement cannot be expressed by composition of existing ones.
- When you generate code, emit references to atoms (by name or symbol) plus configuration, not full re-implementations of CRUD, status handling, tables, forms, etc.

When given a feature request:
1. Identify the primary Objects involved.
2. List the Properties those Objects need (reuse Status, Owner, CreatedAt, Priority, etc. whenever possible).
3. Enumerate the Actions required.
4. Choose the Interfaces that best surface the data and actions.
5. Decide whether any Intelligence or Rules atoms are needed.
6. Emit a composition plan, then the minimal code that realizes it using the library.

Never regenerate a User model, a basic Status enum, a Table component, or a Create/Update/Delete handler from scratch if the library already provides them.
`.trim();

/**
 * Brief context fragment describing the table for inclusion in system prompts.
 * Useful when the full JSON ontology is too large but a structured summary helps.
 */
export const COMPOSITION_CONTEXT_FRAGMENT = `
Available atom families:
- Objects (nouns with identity): User, Task, Invoice, Project, Contact, etc.
- Properties (typed fields): Status, Date, Currency, Priority, Owner, Enum, AI, etc.
- Actions (operations): Create, Update, Delete, Assign, Notify, Approve, Filter, etc.
- Interfaces (views): Table, Kanban, Form, Chart, Calendar, Detail, Card, etc.
- Intelligence (AI primitives): Search, Summarize, Classify, Recommend, Generate, etc.
- Rules (automation): Permission, Trigger, Condition, Audit, Policy, etc.

Select from these before inventing new ones. Compose rather than regenerate.
`.trim();

export const COMPOSITION_PLAN_SCHEMA = {
  type: 'object',
  required: ['objects', 'properties', 'actions', 'interfaces'],
  properties: {
    objects: {
      type: 'array',
      items: { type: 'string' },
      description: 'Names of Object atoms used (e.g. User, Task, Invoice)',
    },
    properties: {
      type: 'array',
      items: { type: 'string' },
      description: 'Property atoms or keys attached to the objects (e.g. Status, Owner, CreatedAt)',
    },
    actions: {
      type: 'array',
      items: { type: 'string' },
      description: 'Action atoms required (e.g. Create, Update, Notify, Export)',
    },
    interfaces: {
      type: 'array',
      items: { type: 'string' },
      description: 'Interface atoms chosen for presentation (e.g. Table, Kanban, Form)',
    },
    intelligence: {
      type: 'array',
      items: { type: 'string' },
      description: 'Optional Intelligence atoms (e.g. Search, Summarize, Recommend)',
    },
    rules: {
      type: 'array',
      items: { type: 'string' },
      description: 'Optional Rules atoms (e.g. Permission, Trigger, Audit)',
    },
    notes: {
      type: 'string',
      description: 'Any composition rationale or open questions',
    },
  },
};

export function formatTableSummary(
  elements: { symbol: string; name: string; family: string; description: string }[],
): string {
  const byFamily: Record<string, string[]> = {};
  for (const el of elements) {
    const entry = `${el.symbol} (${el.name}): ${el.description}`;
    const bucket = byFamily[el.family];
    if (bucket) {
      bucket.push(entry);
    } else {
      byFamily[el.family] = [entry];
    }
  }
  const lines: string[] = ['Available Software Periodic Table elements:'];
  for (const [family, items] of Object.entries(byFamily)) {
    lines.push(`\n${family}:`);
    for (const item of items) {
      lines.push(`  ${item}`);
    }
  }
  return lines.join('\n');
}
