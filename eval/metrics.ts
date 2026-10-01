import type { Family } from '../atoms/core.js';

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
  tokenEstimate: {
    planTokens: number;
    implementationTokens: number;
    totalTokens: number;
  };
  acceptanceChecks: { criterion: string; passed: boolean }[];
  valid: boolean;
}

/**
 * Estimate the number of tokens in a composition plan.
 * Rough heuristic: ~4 characters per token for English/JSON.
 */
export function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

/**
 * Check whether every atom symbol referenced in the plan
 * corresponds to a known element in the periodic table.
 */
export function checkWithinTable(
  plan: CompositionPlan,
  knownSymbols: Set<string>,
): { withinTable: boolean; violations: string[] } {
  const violations: string[] = [];

  const allAtoms = [
    ...plan.objects,
    ...plan.properties,
    ...plan.actions,
    ...plan.interfaces,
    ...plan.intelligence,
    ...plan.rules,
  ];

  for (const atom of allAtoms) {
    if (!knownSymbols.has(atom)) {
      violations.push(atom);
    }
  }

  return { withinTable: violations.length === 0, violations };
}

/**
 * Compute a structural similarity score between two composition plans.
 * Useful for comparing baseline vs. composition outputs.
 */
export function planOverlap(a: CompositionPlan, b: CompositionPlan): number {
  const allKeys = new Set([...Object.keys(a), ...Object.keys(b)]);
  let total = 0;
  let matches = 0;

  for (const key of allKeys) {
    const arrA = (a as unknown as Record<string, string[]>)[key] ?? [];
    const arrB = (b as unknown as Record<string, string[]>)[key] ?? [];
    const setA = new Set(arrA);
    const setB = new Set(arrB);
    total += Math.max(setA.size, setB.size);
    for (const item of setA) {
      if (setB.has(item)) matches++;
    }
  }

  return total === 0 ? 0 : matches / total;
}

/**
 * A scenario scored across N independent model calls.
 *
 * A single sample per scenario cannot distinguish "this approach reliably
 * works" from "we got lucky on one draw". Repeats plus spread make the
 * difference visible instead of implied.
 */
export interface AggregateResult {
  scenarioId: string;
  repeats: number;
  validCount: number;
  withinTableCount: number;
  atomCount: { mean: number; sd: number; min: number; max: number };
  familiesCovered: { mean: number; sd: number };
  totalTokens: { mean: number; sd: number; min: number; max: number };
  acceptanceRate: { mean: number; sd: number };
  /** Scenarios where every repeat passed, none where any repeat failed. */
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

export function aggregateRepeats(scenarioId: string, samples: EvalResult[]): AggregateResult {
  const atoms = samples.map((s) => s.atomCount);
  const tokens = samples.map((s) => s.tokenEstimate.totalTokens);
  const families = samples.map((s) => s.familiesCovered.length);
  const rates = samples.map((s) =>
    s.acceptanceChecks.length === 0 ? 1 : s.acceptanceChecks.filter((c) => c.passed).length / s.acceptanceChecks.length,
  );
  const validCount = samples.filter((s) => s.valid).length;

  return {
    scenarioId,
    repeats: samples.length,
    validCount,
    withinTableCount: samples.filter((s) => s.withinTable).length,
    atomCount: {
      mean: mean(atoms),
      sd: stdev(atoms),
      min: Math.min(...atoms),
      max: Math.max(...atoms),
    },
    familiesCovered: { mean: mean(families), sd: stdev(families) },
    totalTokens: { mean: mean(tokens), sd: stdev(tokens), min: Math.min(...tokens), max: Math.max(...tokens) },
    acceptanceRate: { mean: mean(rates), sd: stdev(rates) },
    stable: validCount === samples.length,
  };
}

/**
 * Generate a human-readable summary of evaluation results.
 */
export function summarizeAggregates(aggregates: AggregateResult[]): string {
  let summary = `=== Aggregate Summary (across repeats) ===\n\n`;
  summary += `Scenarios: ${aggregates.length}\n`;
  summary += `Stable (every repeat valid): ${aggregates.filter((a) => a.stable).length}/${aggregates.length}\n\n`;

  for (const a of aggregates) {
    summary += `  ${a.scenarioId}:\n`;
    summary += `    Repeats: ${a.repeats}, valid: ${a.validCount}/${a.repeats}, within table: ${a.withinTableCount}/${a.repeats}\n`;
    summary += `    Atoms: ${a.atomCount.mean.toFixed(1)} +/- ${a.atomCount.sd.toFixed(2)} (range ${a.atomCount.min}-${a.atomCount.max})\n`;
    summary += `    Families: ${a.familiesCovered.mean.toFixed(1)} +/- ${a.familiesCovered.sd.toFixed(2)}\n`;
    summary += `    Acceptance rate: ${(a.acceptanceRate.mean * 100).toFixed(0)}% +/- ${(a.acceptanceRate.sd * 100).toFixed(1)}pp\n`;
    summary += `    Total tokens: ${a.totalTokens.mean.toFixed(0)} +/- ${a.totalTokens.sd.toFixed(1)} (range ${a.totalTokens.min}-${a.totalTokens.max})\n`;
    summary += `    Stable: ${a.stable}\n\n`;
  }

  return summary;
}

export function summarizeResults(results: EvalResult[]): string {
  const total = results.length;
  const valid = results.filter((r) => r.valid).length;
  const withinTable = results.filter((r) => r.withinTable).length;
  const totalTokens = results.reduce((s, r) => s + r.tokenEstimate.totalTokens, 0);

  let summary = `=== Evaluation Summary ===\n\n`;
  summary += `Scenarios: ${total}\n`;
  summary += `Valid (all checks passed): ${valid}/${total}\n`;
  summary += `Within table: ${withinTable}/${total}\n`;
  summary += `Total estimated tokens (all scenarios): ${totalTokens}\n\n`;

  summary += `Per-Scenario Results:\n`;
  for (const r of results) {
    summary += `  ${r.scenarioId}:\n`;
    summary += `    Atoms used: ${r.atomCount} (families: ${r.familiesCovered.join(', ')})\n`;
    summary += `    Within table: ${r.withinTable}\n`;
    summary += `    Token estimate: ${r.tokenEstimate.totalTokens} (plan: ${r.tokenEstimate.planTokens}, impl: ${r.tokenEstimate.implementationTokens})\n`;
    summary += `    Acceptance: ${r.acceptanceChecks.filter((c) => c.passed).length}/${r.acceptanceChecks.length} passed\n`;
    summary += `    Valid: ${r.valid}\n`;
    summary += `    Atoms: ${[r.plan.objects, r.plan.properties, r.plan.actions, r.plan.interfaces, r.plan.intelligence, r.plan.rules].flat().join(', ')}\n\n`;
  }

  return summary;
}
