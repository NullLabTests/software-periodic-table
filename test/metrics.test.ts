import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  type CompositionPlan,
  checkWithinTable,
  distinctPlanSymbols,
  estimateTokens,
  findUnimplementedAtoms,
  nameNormalizedJson,
  normalizePlanNames,
  planFamilies,
  planJson,
  planOverlap,
  planSymbols,
  planTokens,
  scoreFidelity,
} from '../eval/metrics.js';
import { SCENARIOS } from '../eval/scenarios.js';
import { buildNameIndex, loadOntology, symbolSet, symbolToName } from '../src/ontology.js';

const ontology = loadOntology();
const known = symbolSet(ontology);
const nameIndex = buildNameIndex(ontology);

function plan(overrides: Partial<CompositionPlan> = {}): CompositionPlan {
  return { objects: [], properties: [], actions: [], interfaces: [], intelligence: [], rules: [], ...overrides };
}

describe('planSymbols', () => {
  it('flattens the six families in canonical order', () => {
    const p = plan({ objects: ['Tk'], actions: ['Cr'], rules: ['Pn'] });
    assert.deepEqual(planSymbols(p), ['Tk', 'Cr', 'Pn']);
  });

  it('deduplicates with distinctPlanSymbols', () => {
    const p = plan({ objects: ['Tk'], actions: ['Tk'] });
    assert.deepEqual(distinctPlanSymbols(p), ['Tk']);
  });

  it('ignores the notes field', () => {
    assert.equal(planSymbols(plan({ notes: 'Tk Cr Pn' })).length, 0);
  });
});

describe('planFamilies', () => {
  it('reports only the families in use, in canonical order', () => {
    const p = plan({ rules: ['Pn'], objects: ['Tk'] });
    assert.deepEqual(planFamilies(p), ['objects', 'rules']);
  });
});

describe('checkWithinTable', () => {
  it('passes when every symbol is a real element', () => {
    const result = checkWithinTable(plan({ objects: ['Tk', 'Us'], actions: ['Cr'] }), known);
    assert.equal(result.withinTable, true);
    assert.deepEqual(result.violations, []);
  });

  it('reports each symbol outside the table', () => {
    const result = checkWithinTable(plan({ objects: ['Tk', 'Widget'], actions: ['Cr', 'Frobnicate'] }), known);
    assert.equal(result.withinTable, false);
    assert.deepEqual(result.violations, ['Widget', 'Frobnicate']);
  });
});

// Regression: the original implementation iterated Object.keys(plan), which
// includes `notes`. A free-text rationale was spread into a set of individual
// characters and charged to the denominator, so any plan with notes reported a
// far lower overlap than the same plan without. It reported 0.07 where 0.25 was
// correct.
describe('planOverlap regression', () => {
  const base = plan({
    objects: ['Tk', 'Us', 'Ss', 'Comment'],
    properties: ['Title', 'Py', 'Assignee', 'Ss', 'Ca', 'Ua'],
    actions: ['CreateTask', 'UpdateTask', 'DeleteTask'],
    interfaces: ['KanbanBoard', 'TaskTable'],
    rules: ['Authentication', 'RoleBasedAccess'],
  });

  it('ignores notes entirely', () => {
    const withNotes = planOverlap({ ...base, notes: 'x'.repeat(400) }, plan({ objects: ['Tk'], actions: ['Cr'] }));
    const withoutNotes = planOverlap(base, plan({ objects: ['Tk'], actions: ['Cr'] }));
    assert.equal(withNotes, withoutNotes);
  });

  it('is unaffected by note length', () => {
    const short = planOverlap({ ...base, notes: 'a' }, plan({}));
    const long = planOverlap({ ...base, notes: 'a'.repeat(5000) }, plan({}));
    assert.equal(short, long);
  });

  it('is symmetric', () => {
    const a = plan({ objects: ['Tk', 'Us'], actions: ['Cr'] });
    const b = plan({ objects: ['Us'], actions: ['Cr', 'Up'] });
    assert.equal(planOverlap(a, b), planOverlap(b, a));
  });

  it('returns 1 for identical plans and 0 for disjoint ones', () => {
    const a = plan({ objects: ['Tk', 'Us'] });
    assert.equal(planOverlap(a, plan({ objects: ['Tk', 'Us'] })), 1);
    assert.equal(planOverlap(a, plan({ objects: ['Co', 'Ct'] })), 0);
  });

  it('is 0 when both plans are empty', () => {
    assert.equal(planOverlap(plan(), plan()), 0);
  });
});

describe('scoreFidelity', () => {
  it('reports full recall and precision for an exact match', () => {
    const score = scoreFidelity(plan({ objects: ['Tk'], actions: ['Cr'] }), ['Tk', 'Cr']);
    assert.equal(score.recall, 1);
    assert.equal(score.precision, 1);
    assert.deepEqual(score.matched.sort(), ['Cr', 'Tk']);
    assert.deepEqual(score.missed, []);
    assert.deepEqual(score.spurious, []);
  });

  it('separates missed ground-truth atoms from spurious ones', () => {
    const score = scoreFidelity(plan({ objects: ['Tk'], actions: ['Cr', 'Up'] }), ['Tk', 'Cr', 'Pn']);
    assert.equal(score.recall, 2 / 3);
    assert.equal(score.precision, 2 / 3);
    assert.deepEqual(score.missed, ['Pn']);
    assert.deepEqual(score.spurious, ['Up']);
  });

  it('scores an empty plan as zero rather than dividing by zero', () => {
    const score = scoreFidelity(plan(), ['Tk']);
    assert.equal(score.recall, 0);
    assert.equal(score.precision, 0);
  });
});

describe('nameNormalizedJson', () => {
  const names = symbolToName(ontology);

  it('expands every symbol to its full name', () => {
    const json = nameNormalizedJson(plan({ objects: ['Tk'], actions: ['Cr'] }), names);
    const parsed = JSON.parse(json) as Record<string, string[]>;
    assert.deepEqual(parsed.objects, ['Task']);
    assert.deepEqual(parsed.actions, ['Create']);
  });

  // The published "39% token savings" came from comparing a plan written in
  // 2-character symbols against one written in full descriptive names. Expanding
  // both sides to names removes that advantage, which is the only way the token
  // column can mean anything.
  it('equalises plans that differ only in notation', () => {
    // Both sides expand to full names, so a symbol plan and the equivalent
    // name plan cost the same. This is the correction to the original
    // comparison, which charged the symbol side for a 2-character abbreviation.
    const bySymbol = plan({ objects: ['Tk'], actions: ['Cr'] });
    const byName = plan({ objects: ['Task'], actions: ['Create'] });
    assert.equal(
      estimateTokens(nameNormalizedJson(byName, names)),
      estimateTokens(nameNormalizedJson(bySymbol, names)),
    );
  });

  it('leaves symbols with no name mapping untouched', () => {
    const json = nameNormalizedJson(plan({ objects: ['Widget'] }), names);
    assert.deepEqual((JSON.parse(json) as Record<string, string[]>).objects, ['Widget']);
  });
});

// Regression: names are not unique across families. Email, Message, Search,
// Trigger and Schedule each name two elements. A single flat name map kept
// whichever was declared last, so normalizing a baseline silently moved
// components between families before anything was scored.
describe('normalizePlanNames family scoping', () => {
  const cases: [string, string, string][] = [
    ['objects', 'Email', 'Em'],
    ['properties', 'Email', 'Ea'],
    ['objects', 'Message', 'Ms'],
    ['actions', 'Message', 'Mg'],
    ['actions', 'Search', 'Se'],
    ['intelligence', 'Search', 'Sr'],
    ['actions', 'Trigger', 'Tr'],
    ['rules', 'Trigger', 'Ti'],
    ['actions', 'Schedule', 'Sc'],
    ['rules', 'Schedule', 'Sa'],
  ];

  for (const [family, name, expected] of cases) {
    it(`resolves ${family} "${name}" to ${expected}, not the same name in another family`, () => {
      const normalized = normalizePlanNames(plan({ [family]: [name] }), nameIndex);
      assert.deepEqual(normalized[family as keyof CompositionPlan], [expected]);
    });
  }

  it('resolves names case-insensitively', () => {
    const normalized = normalizePlanNames(plan({ objects: ['TASK', 'user'] }), nameIndex);
    assert.deepEqual(normalized.objects, ['Tk', 'Us']);
  });

  it('is a no-op on a plan that already uses symbols', () => {
    const symbols = plan({ objects: ['Tk', 'Us'], properties: ['Ss'], actions: ['Cr'] });
    assert.deepEqual(normalizePlanNames(symbols, nameIndex), symbols);
  });

  it('preserves a name with no ontology match so it shows up as a violation', () => {
    const normalized = normalizePlanNames(plan({ objects: ['Widget'] }), nameIndex);
    assert.deepEqual(normalized.objects, ['Widget']);
    assert.equal(checkWithinTable(normalized, known).withinTable, false);
  });
});

describe('estimateTokens', () => {
  it('is roughly four characters per token', () => {
    assert.equal(estimateTokens('abcd'), 1);
    assert.equal(estimateTokens('abcde'), 2);
    assert.equal(estimateTokens(''), 0);
  });
});

describe('findUnimplementedAtoms', () => {
  it('flags symbols with no reference implementation', () => {
    const implemented = new Set(['Tk', 'Us']);
    assert.deepEqual(findUnimplementedAtoms(plan({ objects: ['Tk', 'Us'], actions: ['Cr'] }), implemented), ['Cr']);
  });

  it('returns nothing when every atom is implemented', () => {
    const implemented = new Set(['Tk', 'Us']);
    assert.deepEqual(findUnimplementedAtoms(plan({ objects: ['Tk', 'Us'] }), implemented), []);
  });

  it('reports each unimplemented symbol once', () => {
    const p = plan({ objects: ['Tk', 'Tk'], actions: ['Cr'] });
    assert.deepEqual(findUnimplementedAtoms(p, new Set()), ['Tk', 'Cr']);
  });
});

describe('acceptance criteria gate the result', () => {
  // Regression: the original check looped over a keyword map and fell through
  // to `return allSymbols.size > 0`, so any non-empty plan satisfied every
  // criterion. A plan holding one wrong atom scored 4/4.
  for (const scenario of SCENARIOS) {
    it(`${scenario.id}: an empty plan fails every criterion`, () => {
      const empty = new Set<string>();
      for (const criterion of scenario.acceptanceCriteria) {
        assert.ok(
          criterion.requires.some((symbol) => !empty.has(symbol)),
          `${scenario.id}: "${criterion.text}" is satisfiable by an empty plan`,
        );
      }
    });

    it(`${scenario.id}: the ground-truth plan satisfies every criterion`, () => {
      const present = new Set(scenario.groundTruthAtoms);
      for (const criterion of scenario.acceptanceCriteria) {
        assert.ok(
          criterion.requires.some((symbol) => present.has(symbol)),
          `${scenario.id}: "${criterion.text}" requires ${criterion.requires.join('|')}, none in the ground truth`,
        );
      }
    });

    it(`${scenario.id}: every criterion names real symbols`, () => {
      for (const criterion of scenario.acceptanceCriteria) {
        for (const symbol of criterion.requires) {
          assert.ok(known.has(symbol), `${scenario.id}: "${criterion.text}" requires unknown symbol ${symbol}`);
        }
      }
    });

    it(`${scenario.id}: every ground-truth atom is required by some criterion`, () => {
      const required = new Set(scenario.acceptanceCriteria.flatMap((c) => c.requires));
      const uncovered = scenario.groundTruthAtoms.filter((symbol) => !required.has(symbol));
      assert.deepEqual(uncovered, [], `${scenario.id}: ground-truth atoms no criterion checks for`);
    });

    it(`${scenario.id}: ground-truth atoms are all real and in range of minAtomsUsed`, () => {
      for (const symbol of scenario.groundTruthAtoms) {
        assert.ok(known.has(symbol), `${scenario.id}: unknown ground-truth symbol ${symbol}`);
      }
      assert.ok(scenario.groundTruthAtoms.length >= scenario.minAtomsUsed);
    });
  }
});

describe('plan token measurement', () => {
  // `runner.ts` and `agent-eval.ts` must measure plans identically or their
  // numbers are not comparable. They previously differed between pretty-printed
  // and compact JSON, which inflated one side by roughly 40% on whitespace.
  it('serializes plans compactly', () => {
    const p = plan({ objects: ['Tk'] });
    assert.equal(planJson(p), JSON.stringify(p));
    assert.ok(!planJson(p).includes('\n'), 'no pretty-printing newlines');
    assert.ok(!planJson(p).includes('  '), 'no indentation padding');
  });

  it('ignores presentation when measuring a plan', () => {
    const p = plan({ objects: ['Tk'], actions: ['Cr'] });
    assert.equal(planTokens(p), estimateTokens(JSON.stringify(p)));
    assert.notEqual(planTokens(p), estimateTokens(JSON.stringify(p, null, 2)));
  });

  it('is stable for a plan with an empty family', () => {
    const p = plan({ objects: ['Tk'] });
    assert.equal(planTokens(p), estimateTokens(planJson(p)));
  });
});
