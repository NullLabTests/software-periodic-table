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
  plan: CompositionPlan;
  atomsUsed: { family: Family; symbols: string[] }[];
  atomCount: number;
  familiesCovered: Family[];
  withinTable: boolean;
  /** Symbols referenced by the plan that have no reference implementation in atoms/. */
  unimplementedAtoms: string[];
  tokenEstimate: {
    planTokens: number;
    implementationTokens: number;
    totalTokens: number;
    /**
     * Total tokens after both plans are expanded to full atom names. Symbols are
     * two characters and names are typically ten to twenty, so a raw character
     * count structurally favours whichever side emits symbols. This figure
     * removes that naming confound; see docs/EVAL_RESULTS.md.
     */
    nameNormalizedTotalTokens: number;
  };
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
 * Estimate the number of tokens in a text.
 * Rough heuristic: ~4 characters per token for English/JSON.
 */
export function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

/**
 * Canonical serialization of a plan for token measurement.
 *
 * Both harnesses must measure plans the same way or their numbers cannot be
 * compared: `runner.ts` and `agent-eval.ts` previously differed between
 * pretty-printed and compact JSON, which inflated one side by roughly 40% on
 * whitespace alone. Compact is used because it is the form a model actually
 * emits, and because indentation is a presentation artifact rather than content.
 */
export function planJson(plan: CompositionPlan): string {
  return JSON.stringify(plan);
}

/** Token estimate for a plan, using the canonical serialization. */
export function planTokens(plan: CompositionPlan): number {
  return estimateTokens(planJson(plan));
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
 * Re-serialize a plan with every symbol expanded to its full atom name.
 *
 * Comparing two plans by raw character count is unfair when one side is
 * required to emit two-character symbols and the other full names: the symbol
 * side wins on length before either plan is assessed. Expanding both sides to
 * names makes the token comparison measure the plans rather than the notation.
 */
export function nameNormalizedJson(plan: CompositionPlan, symbolToName: Map<string, string>): string {
  const expanded: Record<string, string[] | string> = {};
  for (const family of PLAN_FAMILIES) {
    expanded[family] = (plan[family] ?? []).map((symbol) => symbolToName.get(symbol) ?? symbol);
  }
  if (plan.notes !== undefined) expanded.notes = plan.notes;
  return JSON.stringify(expanded);
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
      return familyNames?.get(key) ?? nameIndex.any.get(key) ?? item;
    });
  }
  if (plan.notes !== undefined) normalized.notes = plan.notes;
  return normalized;
}

/**
 * Generate a human-readable summary of evaluation results.
 */
export function summarizeResults(results: EvalResult[]): string {
  const total = results.length;
  const valid = results.filter((r) => r.valid).length;
  const withinTable = results.filter((r) => r.withinTable).length;
  const recall = results.length === 0 ? 0 : results.reduce((s, r) => s + r.fidelity.recall, 0) / results.length;
  const totalTokens = results.reduce((s, r) => s + r.tokenEstimate.totalTokens, 0);
  const totalNormalized = results.reduce((s, r) => s + r.tokenEstimate.nameNormalizedTotalTokens, 0);

  let summary = `=== Evaluation Summary ===\n\n`;
  summary += `Scenarios: ${total}\n`;
  summary += `Valid (all checks passed): ${valid}/${total}\n`;
  summary += `Within table: ${withinTable}/${total}\n`;
  summary += `Mean ground-truth recall: ${(recall * 100).toFixed(1)}%\n`;
  summary += `Total estimated tokens (raw notation): ${totalTokens}\n`;
  summary += `Total estimated tokens (name-normalized): ${totalNormalized}\n\n`;

  summary += `Per-Scenario Results:\n`;
  for (const r of results) {
    summary += `  ${r.scenarioId}:\n`;
    summary += `    Atoms used: ${r.atomCount} (families: ${r.familiesCovered.join(', ')})\n`;
    summary += `    Within table: ${r.withinTable}\n`;
    if (r.unimplementedAtoms.length > 0) {
      summary += `    Unimplemented atoms: ${r.unimplementedAtoms.join(', ')}\n`;
    }
    summary += `    Fidelity: recall ${(r.fidelity.recall * 100).toFixed(0)}%, precision ${(r.fidelity.precision * 100).toFixed(0)}%\n`;
    if (r.fidelity.missed.length > 0) {
      summary += `    Missed: ${r.fidelity.missed.join(', ')}\n`;
    }
    if (r.fidelity.spurious.length > 0) {
      summary += `    Spurious: ${r.fidelity.spurious.join(', ')}\n`;
    }
    summary += `    Token estimate: ${r.tokenEstimate.totalTokens} (plan: ${r.tokenEstimate.planTokens}, impl: ${r.tokenEstimate.implementationTokens}, name-normalized: ${r.tokenEstimate.nameNormalizedTotalTokens})\n`;
    summary += `    Acceptance: ${r.acceptanceChecks.filter((c) => c.passed).length}/${r.acceptanceChecks.length} passed\n`;
    for (const c of r.acceptanceChecks.filter((x) => !x.passed)) {
      summary += `      FAIL: ${c.criterion} (missing: ${c.missing.join(', ') || 'no known atom'})\n`;
    }
    summary += `    Valid: ${r.valid}\n`;
    summary += `    Atoms: ${planSymbols(r.plan).join(', ')}\n\n`;
  }

  return summary;
}
