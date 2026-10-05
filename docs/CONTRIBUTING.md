# Contributing to the Software Periodic Table

## Philosophy

This library deliberately tries to stay small. The value comes from a *stable, high-quality* set of atoms that agents can trust and reuse, not from an ever-growing catalog of slightly different variants.

Before proposing a new atom, ask:

1. Can the requirement be expressed by composing existing atoms?
2. Is the concept truly recurring across many systems, or is it domain-specific?
3. Does it have a clear, minimal interface?

If the answer to (1) is yes, prefer composition. If the concept is highly domain-specific, it may belong in a separate domain pack rather than the core table.

## Before You Start

Check whether the concept is already covered, including via `composesWith`:

```bash
npm run search -- your-term
npm run search -- your-term --family actions   # names can repeat across families
```

Five names each exist in two families — `Email`, `Message`, `Search`, `Trigger`,
`Schedule` — with distinct symbols. Always resolve a name within its family.

## Adding or Changing an Atom

1. Update `ontology/periodic-table.json` with a stable `id`, `symbol`, `name`, `family`, and `description`.
2. Pick an `id` inside the family's range. The ranges are declared in the ontology
   itself (`familyRanges`) and enforced by the validator, so do not hardcode them.
3. Add or update the corresponding TypeScript definition under `atoms/`.
4. Prefer pure data + small functions. Avoid framework-specific code in the core atoms.
5. Add a test. `npm test` covers the validator, the schema validator, the eval
   metrics, and the atom implementations. A new atom without a test is
   incomplete — the coverage report counts implementation files, and
   `npm run coverage` will show the drop.
6. Keep the public surface minimal and well-typed.

## The Invariants the Validator Enforces

`npm run validate` fails on any of these, and `test/ontology.test.ts` asserts that
it fails on each one:

- Every element matches `ontology/periodic-table.schema.json`.
- `id` and `symbol` are unique.
- `id` falls inside the range declared for its family, and every id in every
  family range is allocated exactly once — no gaps, no overlaps.
- `family` is one of the six.
- Every `composesWith` symbol resolves to a real element.
- An element does not compose with itself (a warning, not an error).

`npm run coverage` additionally cross-checks the two directories against each
other: an atom file with no ontology entry is an orphan, and a mismatch between
an atom's declared `symbol`/`name` and the ontology is an error. Renaming a
symbol in one place and not the other will fail CI.

## Families

- **Objects** — nouns with identity.
- **Properties** — typed fields and common vocabularies.
- **Actions** — declarative operations (execution is the host's job).
- **Interfaces** — presentation and interaction surfaces.
- **Intelligence** — model-backed capabilities with clear contracts.
- **Rules** — triggers, conditions, permissions, audit.

## Style

- TypeScript, strict mode, with `noUncheckedIndexedAccess` enabled. Indexing an
  array or record and getting `undefined` is a type error, not a surprise.
- No runtime dependencies in core atoms. The schema validator in
  `src/jsonschema.ts` is hand-written for exactly this reason.
- Prefer explicit interfaces over heavy class hierarchies.
- Document the intended composition patterns in comments or short markdown notes.
- Relative imports carry their `.js` extension, so the source runs under `tsx`
  and the compiled output runs under plain `node`.

## Evaluation

If you change composition behaviour or the eval metrics, add a case to
`test/metrics.test.ts`. Those tests exist because the harness previously had
three defects that silently produced plausible-looking numbers:

- `planOverlap` counted the characters of a plan's free-text `notes` field.
- Acceptance criteria passed on any non-empty plan, because an unmatched
  criterion fell through to a default.
- A name-to-symbol lookup resolved across families, so an ambiguous name landed
  in whichever family was declared last.

If you change what a metric *means*, update `docs/EVAL_RESULTS.md` and
`eval/README.md` in the same change. That document records which numbers are
trustworthy and why, including one that had to be withdrawn.

## Pull Requests

Run the full gate before opening:

```bash
npm run ci
```

This runs validation, the coverage report, lint, type-checking across all three
tsconfig projects, the test suite, a build, and every example. The PR template
repeats this checklist.
