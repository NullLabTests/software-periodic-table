import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import * as metricsNamespace from '../eval/metrics.js';
import {
  type CompositionPlan,
  checkWithinTable,
  distinctPlanSymbols,
  type EvalResult,
  findMisfiledNames,
  findUnimplementedAtoms,
  normalizePlanNames,
  planFamilies,
  planJson,
  planOverlap,
  planSymbols,
  scoreFidelity,
  summarizeResults,
} from '../eval/metrics.js';
import { SCENARIOS } from '../eval/scenarios.js';
import { buildNameIndex, loadOntology, symbolSet } from '../src/ontology.js';

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

  // Regression: the family-scoped lookup originally fell back to a flat `any`
  // map, which reinstated the family-blindness the function exists to prevent.
  // A wrong-family name is now left in place and reported, not rehomed.
  const crossFamily: [string, string][] = [
    ['objects', 'Search'],
    ['objects', 'Status'],
    ['objects', 'Trigger'],
    ['interfaces', 'Create'],
    ['rules', 'Message'],
    ['properties', 'Schedule'],
    ['objects', 'Audit'],
    ['rules', 'Grid'],
  ];

  for (const [family, name] of crossFamily) {
    it(`does not rehome "${name}" when it is filed under ${family}`, () => {
      const normalized = normalizePlanNames(plan({ [family]: [name] }), nameIndex);
      assert.deepEqual(
        normalized[family as keyof CompositionPlan],
        [name],
        'the name must stay put so it is scored as a miss rather than silently credited',
      );
    });
  }

  it('reports a wrong-family name as misfiled rather than as unknown', () => {
    const misfiled = findMisfiledNames(plan({ objects: ['Search'] }), nameIndex);
    assert.deepEqual(misfiled, [
      { family: 'objects', name: 'Search', expectedSymbol: 'Sr', actualFamily: 'intelligence' },
    ]);
  });

  it('reports nothing misfiled for a plan that uses symbols correctly', () => {
    assert.deepEqual(findMisfiledNames(plan({ objects: ['Tk'], intelligence: ['Sr'] }), nameIndex), []);
  });

  it('reports nothing misfiled for a name that is in no family at all', () => {
    assert.deepEqual(findMisfiledNames(plan({ objects: ['Widget'] }), nameIndex), []);
  });
});

// Regression: `runner.ts` counted every list entry while `agent-eval.ts` counted
// distinct symbols, so a plan listing the same atom twice scored differently
// depending on which harness produced it.
describe('symbol counting is deduplicated', () => {
  it('counts a repeated symbol once', () => {
    const p = plan({ objects: ['Tk', 'Tk', 'Tk'] });
    assert.equal(distinctPlanSymbols(p).length, 1);
  });

  it('still counts symbols that appear in different families', () => {
    const p = plan({ objects: ['Tk'], actions: ['Tk'] });
    assert.equal(distinctPlanSymbols(p).length, 1);
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

    // Regression: `minAtomsUsed` sat at 7-9 while the real minimum a plan needs
    // to pass acceptance was 12-15, so the gate could never trip and read as a
    // guard while being decorative. It must stay at the true minimum, and stay
    // no higher, or it starts failing plans that pass every criterion.
    it(`${scenario.id}: minAtomsUsed is the true minimum, not a decorative number`, () => {
      const required = new Set(scenario.acceptanceCriteria.flatMap((c) => c.requires));
      assert.equal(scenario.minAtomsUsed, required.size, 'a plan passing every criterion uses exactly this many atoms');
      assert.ok(scenario.minAtomsUsed > 0);
    });
  }
});

// Both arms are written to the same artifact, so the summary has to keep them
// apart: pooling them would average two different quantities and report the
// scenario count as double what it is.
describe('summarizeResults reports each arm separately', () => {
  function result(arm: 'composition' | 'baseline', id: string): EvalResult {
    return {
      scenarioId: id,
      arm,
      plan: plan({ objects: ['Tk'] }),
      atomsUsed: [{ family: 'objects', symbols: ['Tk'] }],
      atomCount: 1,
      familiesCovered: ['objects'],
      withinTable: true,
      unimplementedAtoms: [],
      misfiledNames: [],
      fidelity: { recall: arm === 'composition' ? 1 : 0.5, precision: 1, matched: [], missed: [], spurious: [] },
      acceptanceChecks: [],
      valid: true,
    };
  }

  const summary = summarizeResults([result('composition', 'a'), result('baseline', 'a')]);

  it('labels each arm with its own scenario count', () => {
    assert.match(summary, /composition \(1 scenarios\)/);
    assert.match(summary, /baseline \(1 scenarios\)/);
  });

  it('does not average the two arms together', () => {
    const block = (arm: string): string => summary.split(`${arm} (1 scenarios)\n`)[1]?.split('\n\n')[0] ?? '';
    assert.match(block('composition'), /Mean ground-truth recall: 100\.0%/);
    assert.match(block('baseline'), /Mean ground-truth recall: 50\.0%/);
    assert.doesNotMatch(summary, /Mean ground-truth recall: 75\.0%/);
  });

  it('records why an arm produced nothing rather than dropping the scenario', () => {
    const failed = { ...result('composition', 'b'), error: 'boom', valid: false };
    const text = summarizeResults([failed]);
    assert.match(text, /b \[composition\]/);
    assert.match(text, /ERROR: boom/);
    assert.match(text, /Errored: 1\/1/);
  });
});

describe('planJson', () => {
  // One canonical serialization, so any future metric reads the same bytes from
  // either harness. They previously differed between pretty-printed and compact
  // JSON, which inflated one side by roughly 40% on whitespace alone.
  it('serializes plans compactly', () => {
    const p = plan({ objects: ['Tk'] });
    assert.equal(planJson(p), JSON.stringify(p));
    assert.ok(!planJson(p).includes('\n'), 'no pretty-printing newlines');
    assert.ok(!planJson(p).includes('  '), 'no indentation padding');
  });
});

// The token metric was withdrawn: `chars/4` measured against a real tokenizer
// came out -21% on symbol plans and +9% on name-expanded plans, so the apparent
// notation saving was an artifact of the estimator. These assertions exist to
// stop it creeping back in as a renamed character count.
describe('no token metric', () => {
  const metrics = metricsModule() as Record<string, unknown>;

  for (const banned of ['estimateTokens', 'planTokens', 'nameNormalizedJson']) {
    it(`does not export ${banned}`, () => {
      assert.equal(banned in metrics, false, `${banned} must not come back`);
    });
  }

  it('exports no metric whose name suggests counting tokens or characters', () => {
    const suspicious = Object.keys(metrics).filter((k) => /token|char|length|size/i.test(k));
    assert.deepEqual(suspicious, []);
  });
});

function metricsModule(): unknown {
  return metricsNamespace;
}
