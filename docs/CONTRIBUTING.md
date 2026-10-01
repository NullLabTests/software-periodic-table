# Contributing to the Software Periodic Table

## Philosophy

This library deliberately tries to stay small. The value comes from a *stable, high-quality* set of atoms that agents can trust and reuse, not from an ever-growing catalog of slightly different variants.

Before proposing a new atom, ask:

1. Can the requirement be expressed by composing existing atoms?
2. Is the concept truly recurring across many systems, or is it domain-specific?
3. Does it have a clear, minimal interface?

If the answer to (1) is yes, prefer composition. If the concept is highly domain-specific, it may belong in a separate domain pack rather than the core table.

## Adding or Changing an Atom

1. Update `ontology/periodic-table.json` with a stable `id`, `symbol`, `name`, `family`, and `description`.
2. Add or update the corresponding TypeScript definition under `atoms/`.
3. Prefer pure data + small functions. Avoid framework-specific code in the core atoms.
4. Add at least one usage example or test that shows composition with other atoms.
5. Keep the public surface minimal and well-typed.

## Families

- **Objects** — nouns with identity.
- **Properties** — typed fields and common vocabularies.
- **Actions** — declarative operations (execution is the host's job).
- **Interfaces** — presentation and interaction surfaces.
- **Intelligence** — model-backed capabilities with clear contracts.
- **Rules** — triggers, conditions, permissions, audit.

## Style

- TypeScript, strict mode.
- No runtime dependencies in core atoms if possible.
- Prefer explicit interfaces over heavy class hierarchies.
- Document the intended composition patterns in comments or short markdown notes.

## Evaluation

When you change composition behavior or add significant atoms, consider updating or extending the stubs in `eval/` so that token usage and success rate can be measured over time.

Before opening a PR:

```bash
npm run validate   # ontology integrity
npm run lint       # biome
npm run check      # tsc --noEmit
npm test           # harness unit tests
```

CI runs all four plus `npm run eval` in mock mode. If you touch `eval/metrics.ts`
or `eval/llm.ts`, add or update cases in `eval/metrics.test.ts`; CI will not catch
a scoring regression otherwise.
