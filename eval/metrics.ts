import type { Family } from '../atoms/core.js';
import type { NameIndex } from '../src/ontology.js';

export type { Family };

/** The six families, in canonical order. Every plan is keyed by exactly these. */
export const PLAN_FAMILIES = [
  'objects',
  'properties',
  'actions',
  'interfaces',
  'intelligence',
  'rules',
] as const satisfies readonly Family[];

export interface CompositionPlan {
  objects: string[];
  properties: string[];
  actions: string[];
  interfaces: string[];
  intelligence: string[];
  rules: string[];
  notes?: string;
}

export interface EvalResult {
  scenarioId: string;
  /** Which arm produced this plan. Both arms are recorded so a run is self-describing. */
  arm: 'composition' | 'baseline';
  plan: CompositionPlan;
  atomsUsed: { family: Family; symbols: string[] }[];
  atomCount: number;
  familiesCovered: Family[];
  withinTable: boolean;
  /** Symbols referenced by the plan that have no reference implementation in atoms/. */
  unimplementedAtoms: string[];
  /** Plan entries naming a real atom that sits in the wrong family bucket. */
  misfiledNames: { family: Family; name: string; expectedSymbol: string; actualFamily: Family }[];
  /** Set when the arm failed to produce a scoreable plan, so N never shrinks silently. */
  error?: string;
  /** How closely the produced plan matches the scenario's ground-truth atom set. */
  fidelity: FidelityScore;
  acceptanceChecks: { criterion: string; passed: boolean; missing: string[] }[];
  valid: boolean;
}

export interface FidelityScore {
  /** Ground-truth atoms the plan found, as a fraction of all ground-truth atoms. */
  recall: number;
  /** Ground-truth atoms in the plan, as a fraction of all atoms the plan used. */
  precision: number;
  matched: string[];
  missed: string[];
  spurious: string[];
}

export const EMPTY_FIDELITY: FidelityScore = {
  recall: 0,
  precision: 0,
  matched: [],
  missed: [],
  spurious: [],
};

/**
 * Canonical serialization of a plan.
 *
 * Both harnesses must serialize plans the same way or their numbers cannot be
 * compared: `runner.ts` and `agent-eval.ts` previously differed between
 * pretty-printed and compact JSON, which inflated one side by roughly 40% on
 * whitespace alone. Compact is used because it is the form a model actually
 * emits, and because indentation is a presentation artifact rather than content.
 *
 * This exists for stable comparison and for human-readable diagnostics. It is
 * deliberately not used to report a token count; see the note on token metrics
 * in docs/EVAL_RESULTS.md for why character counts cannot support that claim.
 */
export function planJson(plan: CompositionPlan): string {
  return JSON.stringify(plan);
}

/** Every symbol referenced by a plan, in canonical family order. */
export function planSymbols(plan: CompositionPlan): string[] {
  return PLAN_FAMILIES.flatMap((family) => plan[family] ?? []);
}

/** Distinct symbols referenced by a plan, in canonical family order. */
export function distinctPlanSymbols(plan: CompositionPlan): string[] {
  return [...new Set(planSymbols(plan))];
}

/** The families a plan draws from, in canonical order. */
export function planFamilies(plan: CompositionPlan): Family[] {
  return PLAN_FAMILIES.filter((family) => (plan[family] ?? []).length > 0);
}

/**
 * Check whether every atom symbol referenced in the plan
 * corresponds to a known element in the periodic table.
 */
export function checkWithinTable(
  plan: CompositionPlan,
  knownSymbols: Set<string>,
): { withinTable: boolean; violations: string[] } {
  const violations = planSymbols(plan).filter((symbol) => !knownSymbols.has(symbol));
  return { withinTable: violations.length === 0, violations };
}

/**
 * Compute a structural similarity score between two composition plans,
 * as the fraction of symbols in the larger plan that the other plan also uses.
 *
 * Only the six family buckets are compared. A plan also carries a `notes` field
 * holding free text; iterating the whole object would spread that string into a
 * set of individual characters and charge them to the denominator, which
 * silently depressed every overlap score.
 */
export function planOverlap(a: CompositionPlan, b: CompositionPlan): number {
  let total = 0;
  let matches = 0;

  for (const family of PLAN_FAMILIES) {
    const setA = new Set(a[family] ?? []);
    const setB = new Set(b[family] ?? []);
    total += Math.max(setA.size, setB.size);
    for (const symbol of setA) {
      if (setB.has(symbol)) matches++;
    }
  }

  return total === 0 ? 0 : matches / total;
}

/**
 * Score a produced plan against a ground-truth atom set.
 *
 * This is the primary fidelity metric because it does not depend on how atoms
 * are named or how many characters a plan contains.
 */
export function scoreFidelity(plan: CompositionPlan, groundTruth: Iterable<string>): FidelityScore {
  const truth = new Set(groundTruth);
  const actual = new Set(planSymbols(plan));
  const matched = [...truth].filter((symbol) => actual.has(symbol));
  const missed = [...truth].filter((symbol) => !actual.has(symbol));
  const spurious = [...actual].filter((symbol) => !truth.has(symbol));

  return {
    recall: truth.size === 0 ? 0 : matched.length / truth.size,
    precision: actual.size === 0 ? 0 : matched.length / actual.size,
    matched,
    missed,
    spurious,
  };
}

/**
 * Plan entries that name a real atom but sit in the wrong family bucket.
 *
 * These are distinct from out-of-table violations: the name exists, it is just
 * filed under a family whose atoms it cannot satisfy. Scoring treats them as
 * misses (which is the honest reading) but reporting them separately tells a
 * model author "move this component", not "invent a symbol".
 */
export function findMisfiledNames(
  plan: CompositionPlan,
  nameIndex: NameIndex,
): { family: Family; name: string; expectedSymbol: string; actualFamily: Family }[] {
  const familyOfSymbol = new Map<string, Family>();
  for (const [family, names] of nameIndex.byFamily) {
    for (const symbol of new Set(names.values())) {
      if (!familyOfSymbol.has(symbol)) familyOfSymbol.set(symbol, family as Family);
    }
  }

  const misfiled: { family: Family; name: string; expectedSymbol: string; actualFamily: Family }[] = [];
  for (const family of PLAN_FAMILIES) {
    const familyNames = nameIndex.byFamily.get(family);
    for (const item of plan[family] ?? []) {
      const key = item.toLowerCase();
      if (familyNames?.has(key)) continue;
      const symbol = nameIndex.any.get(key);
      if (!symbol) continue;
      const actualFamily = familyOfSymbol.get(symbol);
      if (actualFamily && actualFamily !== family) {
        misfiled.push({ family, name: item, expectedSymbol: symbol, actualFamily });
      }
    }
  }
  return misfiled;
}

/**
 * Symbols a plan references that have no reference implementation in atoms/.
 * A plan can be entirely within the table and still be unimplementable.
 */
export function findUnimplementedAtoms(plan: CompositionPlan, implemented: Set<string>): string[] {
  return distinctPlanSymbols(plan).filter((symbol) => !implemented.has(symbol));
}

/**
 * Rewrite full atom names in a plan to their ontology symbols, resolving each
 * name within the family it was found in.
 *
 * A bare-name lookup is not safe: Email, Message, Search, Trigger and Schedule
 * each name two elements in different families, so a single flat map resolves
 * them to whichever family happened to be declared last — silently moving a
 * component into the wrong family before anything is scored against it. The
 * family buckets in a plan carry that information, so use them.
 *
 * There is deliberately no fallback to `nameIndex.any`. An earlier version had
 * one, and it quietly reintroduced the exact family-blindness this function
 * exists to prevent: `objects: ['Search']` resolved to `Sr` (intelligence) and
 * `actions`/`interfaces: ['Create']` resolved to `Cr` (actions), so components
 * were rehomed before scoring. A name that belongs in another family is a real
 * atom in the wrong bucket, and the harness reports that as a misfiled name
 * rather than silently moving it. Use `findMisfiledNames` to surface those.
 *
 * Names with no match are returned unchanged, which is what makes an
 * out-of-table name show up as a violation instead of being quietly dropped.
 */
export function normalizePlanNames(plan: CompositionPlan, nameIndex: NameIndex): CompositionPlan {
  const normalized: CompositionPlan = {
    objects: [],
    properties: [],
    actions: [],
    interfaces: [],
    intelligence: [],
    rules: [],
  };
  for (const family of PLAN_FAMILIES) {
    const familyNames = nameIndex.byFamily.get(family);
    normalized[family] = (plan[family] ?? []).map((item) => {
      const key = item.toLowerCase();
      return familyNames?.get(key) ?? item;
    });
  }
  if (plan.notes !== undefined) normalized.notes = plan.notes;
  return normalized;
}

export interface Stats {
  mean: number;
  /** Sample standard deviation; 0 for fewer than two samples. */
  sd: number;
  min: number;
  max: number;
}

/**
 * A scenario and arm scored across N independent model calls.
 *
 * A single sample per scenario cannot distinguish "this approach reliably
 * works" from "we got lucky on one draw". Repeats plus spread make the
 * difference visible instead of implied.
 */
export interface AggregateResult {
  scenarioId: string;
  arm: EvalResult['arm'];
  repeats: number;
  validCount: number;
  withinTableCount: number;
  atomCount: Stats;
  familiesCovered: Stats;
  recall: Stats;
  precision: Stats;
  acceptanceRate: Stats;
  /** True only when every repeat was valid. */
  stable: boolean;
}

export function mean(xs: number[]): number {
  return xs.length === 0 ? 0 : xs.reduce((a, b) => a + b, 0) / xs.length;
}

/** Sample standard deviation. Returns 0 for fewer than two samples. */
export function stdev(xs: number[]): number {
  if (xs.length < 2) return 0;
  const m = mean(xs);
  return Math.sqrt(xs.reduce((s, x) => s + (x - m) ** 2, 0) / (xs.length - 1));
}

function stats(xs: number[]): Stats {
  if (xs.length === 0) return { mean: 0, sd: 0, min: 0, max: 0 };
  return { mean: mean(xs), sd: stdev(xs), min: Math.min(...xs), max: Math.max(...xs) };
}

export function aggregateRepeats(scenarioId: string, samples: EvalResult[]): AggregateResult {
  const arm = samples[0]?.arm ?? 'composition';
  const acceptanceRates = samples.map((sample) =>
    sample.acceptanceChecks.length === 0
      ? 1
      : sample.acceptanceChecks.filter((check) => check.passed).length / sample.acceptanceChecks.length,
  );
  const validCount = samples.filter((sample) => sample.valid).length;

  return {
    scenarioId,
    arm,
    repeats: samples.length,
    validCount,
    withinTableCount: samples.filter((sample) => sample.withinTable).length,
    atomCount: stats(samples.map((sample) => sample.atomCount)),
    familiesCovered: stats(samples.map((sample) => sample.familiesCovered.length)),
    recall: stats(samples.map((sample) => sample.fidelity.recall)),
    precision: stats(samples.map((sample) => sample.fidelity.precision)),
    acceptanceRate: stats(acceptanceRates),
    stable: samples.length > 0 && validCount === samples.length,
  };
}

/**
 * Human-readable summary across repeats. No token or character metric is
 * reported; see docs/EVAL_RESULTS.md.
 */
export function summarizeAggregates(aggregates: AggregateResult[]): string {
  let summary = `=== Aggregate Summary (across repeats) ===\n\n`;
  summary += `Scenario arms: ${aggregates.length}\n`;
  summary += `Stable (every repeat valid): ${aggregates.filter((a) => a.stable).length}/${aggregates.length}\n\n`;

  for (const a of aggregates) {
    summary += `  ${a.scenarioId} [${a.arm}]:\n`;
    summary += `    Repeats: ${a.repeats}, valid: ${a.validCount}/${a.repeats}, within table: ${a.withinTableCount}/${a.repeats}\n`;
    summary += `    Atoms: ${a.atomCount.mean.toFixed(1)} +/- ${a.atomCount.sd.toFixed(2)} (range ${a.atomCount.min}-${a.atomCount.max})\n`;
    summary += `    Families: ${a.familiesCovered.mean.toFixed(1)} +/- ${a.familiesCovered.sd.toFixed(2)}\n`;
    summary += `    Recall: ${(a.recall.mean * 100).toFixed(1)}% +/- ${(a.recall.sd * 100).toFixed(1)}pp (range ${(a.recall.min * 100).toFixed(0)}-${(a.recall.max * 100).toFixed(0)}%)\n`;
    summary += `    Precision: ${(a.precision.mean * 100).toFixed(1)}% +/- ${(a.precision.sd * 100).toFixed(1)}pp\n`;
    summary += `    Acceptance rate: ${(a.acceptanceRate.mean * 100).toFixed(1)}% +/- ${(a.acceptanceRate.sd * 100).toFixed(1)}pp\n`;
    summary += `    Stable: ${a.stable}\n\n`;
  }

  return summary;
}

/**
 * Generate a human-readable summary of evaluation results.
 *
 * Both arms are reported separately. Pooling them would average a number that
 * means different things for each arm, and would make the scenario count read as
 * double what it is.
 */
export function summarizeResults(results: EvalResult[]): string {
  const arms: EvalResult['arm'][] = ['composition', 'baseline'];
  let summary = `=== Evaluation Summary ===\n\n`;

  for (const arm of arms) {
    const scoped = results.filter((r) => r.arm === arm);
    if (scoped.length === 0) continue;

    const valid = scoped.filter((r) => r.valid).length;
    const withinTable = scoped.filter((r) => r.withinTable).length;
    const recall = scoped.reduce((s, r) => s + r.fidelity.recall, 0) / scoped.length;
    const misfiled = scoped.filter((r) => r.misfiledNames.length > 0).length;
    const errored = scoped.filter((r) => r.error !== undefined).length;

    summary += `${arm} (${scoped.length} scenarios)\n`;
    summary += `  Valid (all checks passed): ${valid}/${scoped.length}\n`;
    summary += `  Within table: ${withinTable}/${scoped.length}\n`;
    summary += `  Mean ground-truth recall: ${(recall * 100).toFixed(1)}%\n`;
    summary += `  Misfiled names: ${misfiled}/${scoped.length}\n`;
    if (errored > 0) summary += `  Errored: ${errored}/${scoped.length}\n`;
    summary += `\n`;
  }

  summary += `Per-Scenario Results:\n`;
  for (const r of results) {
    summary += `  ${r.scenarioId} [${r.arm}]:\n`;
    if (r.error !== undefined) {
      summary += `    ERROR: ${r.error}\n\n`;
      continue;
    }
    summary += `    Atoms used: ${r.atomCount} (families: ${r.familiesCovered.join(', ')})\n`;
    summary += `    Within table: ${r.withinTable}\n`;
    if (r.unimplementedAtoms.length > 0) {
      summary += `    Unimplemented atoms: ${r.unimplementedAtoms.join(', ')}\n`;
    }
    if (r.misfiledNames.length > 0) {
      summary += `    Misfiled names: ${r.misfiledNames.map((m) => `${m.name} in ${m.family} -> ${m.expectedSymbol} (${m.actualFamily})`).join('; ')}\n`;
    }
    summary += `    Fidelity: recall ${(r.fidelity.recall * 100).toFixed(0)}%, precision ${(r.fidelity.precision * 100).toFixed(0)}%\n`;
    if (r.fidelity.missed.length > 0) {
      summary += `    Missed: ${r.fidelity.missed.join(', ')}\n`;
    }
    if (r.fidelity.spurious.length > 0) {
      summary += `    Spurious: ${r.fidelity.spurious.join(', ')}\n`;
    }
    summary += `    Acceptance: ${r.acceptanceChecks.filter((c) => c.passed).length}/${r.acceptanceChecks.length} passed\n`;
    for (const c of r.acceptanceChecks.filter((x) => !x.passed)) {
      summary += `      FAIL: ${c.criterion} (missing: ${c.missing.join(', ') || 'no known atom'})\n`;
    }
    summary += `    Valid: ${r.valid}\n`;
    summary += `    Atoms: ${planSymbols(r.plan).join(', ')}\n\n`;
  }

  return summary;
}
