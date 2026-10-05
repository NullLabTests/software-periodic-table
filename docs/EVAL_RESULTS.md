# Evaluation: Does the Periodic Table Actually Help?

**Status: the previously published "39% token savings" figure is withdrawn.** The
reason is a defect in the measurement, not in the idea. This document explains
what was wrong, what the harness measures now, and what a real result would have
to look like.

## What the old number was, and why it does not hold

An earlier version of this document reported that composition plans used ~39%
fewer tokens than baseline plans across six scenarios, and the README repeated
the figure. Those runs did happen, and the raw output was real. But the metric
could not support the conclusion drawn from it.

The harness estimated tokens as `characters / 4` over the plan JSON. The
baseline arm was asked to describe the components it would build using ordinary
descriptive names — and it produced things like `CreateTask`, `DeleteTask`,
`MoveStatus`, `KanbanBoard`, `RoleBasedAccess`. The composition arm was required
to emit two-character atom symbols — `Cr`, `De`, `Kb`, `Pn`.

So the comparison was:

| | Notation | Example length |
|---|---|---|
| Baseline | `RoleBasedAccess` | 16 chars |
| Composition | `Pn` | 2 chars |

A 2-character symbol beats a 16-character name roughly eight to one *before
either plan is assessed for anything*. The measured savings were largely the cost
of the abbreviation, not the cost of the approach. The same experiment run with
any controlled vocabulary would have produced a similar number.

Three other observations from that same data contradicted the way it was framed:

- **The plans were not the same plan.** Measured plan overlap between the two
  arms ran 10–30%. The claim was that composition expresses *the same plan* more
  cheaply; the harness's own overlap metric said the two plans largely disagreed.
- **The composition plans were smaller partly because they were less complete.**
  Baseline plans averaged 27 atoms across all six families; composition plans
  13–20. Some dropped governance or intelligence atoms entirely.
- **The baseline wrote a `notes` rationale and the composition arm did not.**
  Free text was serialised into the token count and charged to one side only.

The 39% figure was never a measurement of composition being cheaper than
generation. It is withdrawn rather than restated.

There is a second, smaller problem, now fixed: `planOverlap` iterated every key
of the plan object, which includes the free-text `notes` field. Spreading a
sentence into a set produced a set of its individual characters, and those were
charged to the denominator. Every overlap score was deflated — the task-board
figure read 0.07 where 0.25 was correct. The fix is in `planOverlap`, with a
regression test in `test/metrics.test.ts`.

## What the harness measures now

### Primary: fidelity against ground truth

Each scenario declares a ground-truth atom set. A plan is scored on recall and
precision against it. This is independent of notation, independent of plan length,
and it is the metric that actually asks whether composition found the right
components.

### Acceptance criteria that can fail

Each criterion names the atoms that satisfy it:

```typescript
{ text: 'Tasks display in both Kanban and Table views', requires: ['Kb', 'Tb'] }
```

A criterion passes only when the plan actually contains the required atoms, and a
failure reports which atom was missing. The previous implementation matched
criteria by keyword and fell through to `return allSymbols.size > 0`, so any
non-empty plan satisfied every criterion — a plan containing one wrong atom
scored 4/4 on the task board. Under the current check that same plan scores 0/7.

`within table` is reported but is **not** a result: the baseline was never given
the table, so it cannot stay inside it. Scoring that as a baseline failure would
be comparing the two arms on a rule only one was asked to follow.

### Tokens, with the confound removed

Token counts are still reported, and are now reported twice. Every plan is
additionally serialized with all symbols expanded to full atom names
(`nameNormalizedJson`), so both arms are measured in the same notation. The
raw figure is an upper bound on any real advantage; the name-normalized figure is
the one worth reading. If composition only looks cheaper in the raw column, the
advantage is the abbreviation.

### What is still missing

**No corrected LLM run has been published.** The harness is fixed and
reproducible, but producing honest numbers needs an API key, and no run has been
committed. Until one is, this project has no empirical claim to make about whether
composition beats generation. The evaluation methodology and the ontology are the
contributions; the result is outstanding work.

## Running it yourself

```bash
npm ci

# Harness self-check. Replays each scenario's own ground-truth plan, which
# validates the metrics and the ontology. It measures no model behaviour: every
# plan is within the table by construction, so recall is 1.0 by definition.
npm run eval

# Real baseline vs composition, same model both arms.
OPENAI_API_KEY=sk-... npm run eval
# or: LLM_API_KEY=sk-... LLM_MODEL=gpt-4o npm run eval
# or, against another provider:
OPENAI_API_KEY=... LLM_BASE_URL=https://host/v1 npm run eval
```

Results are written to `eval-results.json`, which is gitignored. If you publish a
run, commit the JSON alongside the table in this document so the numbers can be
checked.

### Comparing two agents instead of two prompts

```bash
npx tsx eval/agent-eval.ts baseline      # print the prompt for the baseline agent
npx tsx eval/agent-eval.ts composition   # print the prompt for the composition agent
npx tsx eval/agent-eval.ts compare       # score both saved result files
```

Override the input and output paths with `SPT_BASELINE_OUT` and
`SPT_COMPOSITION_OUT`.

## What a result would need to show

For the thesis to be supported, a real run should show composition plans scoring
**higher ground-truth recall** than baseline plans that were reverse-engineered
into the same vocabulary, and passing **more acceptance criteria** — with the
advantage surviving the name-normalized token comparison. Higher recall alone
would be the result worth having: it would mean the table helps an agent find the
right components, independently of how any of it is written.
