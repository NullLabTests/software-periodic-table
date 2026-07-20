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
 * Generate a human-readable summary of evaluation results.
 */
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
