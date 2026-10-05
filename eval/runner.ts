/**
 * Evaluation harness.
 *
 * Compares two strategies for turning a feature request into a composition plan:
 *
 *   baseline    — the model with no knowledge of the Periodic Table
 *   composition — the same model given the ontology and the composition prompt
 *
 * Both are measured with the same functions in `metrics.ts`, so the comparison
 * is like-for-like on the things that matter:
 *
 *   fidelity    — recall/precision against the scenario's ground-truth atom set.
 *                  This is the primary result: it is independent of how atoms are
 *                  named and of how much text a plan happens to contain.
 *   acceptance  — every criterion names the atoms that satisfy it, so a plan is
 *                  marked down for omitting one rather than passing by default.
 *   tokens      — reported, but see the note below.
 *
 * On tokens: a plan that spells out `CreateTask`, `DeleteTask` and
 * `RoleBasedAccess` is longer than one that writes `Cr`, `De` and `Pn`, so a raw
 * character count rewards the symbol side before either plan is assessed. Every
 * token figure is therefore also reported with both sides expanded to full atom
 * names (`nameNormalizedTotalTokens`), which measures the plan rather than the
 * notation. Treat raw-token savings as an upper bound, not a finding.
 *
 * Usage:
 *   npx tsx eval/runner.ts                    # mock: replays the ground truth
 *   OPENAI_API_KEY=sk-... npx tsx eval/runner.ts   # real baseline vs composition
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
import { formatTableSummary } from '../composer/prompt.js';
import { findAtoms } from '../scripts/coverage.js';
import { buildNameIndex, loadOntology, type NameIndex, symbolIndex, symbolToName } from '../src/ontology.js';
import {
  type CompositionPlan,
  checkWithinTable,
  type EvalResult,
  estimateTokens,
  type Family,
  type FidelityScore,
  findUnimplementedAtoms,
  nameNormalizedJson,
  normalizePlanNames,
  PLAN_FAMILIES,
  planFamilies,
  planSymbols,
  planTokens,
  scoreFidelity,
  summarizeResults,
} from './metrics.js';
import { type AcceptanceCriterion, type EvalScenario, SCENARIOS } from './scenarios.js';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(HERE, '..');

/**
 * API key lookup. `LLM_API_KEY` is the harness's own name for it; `OPENAI_API_KEY`
 * is what the README tells people to set. Both are honoured so the documented
 * command actually runs the LLM path instead of silently falling back to mock.
 */
function resolveApiKey(): string | undefined {
  return process.env.LLM_API_KEY ?? process.env.OPENAI_API_KEY;
}

function resolveModel(): string | undefined {
  return process.env.LLM_MODEL ?? process.env.OPENAI_MODEL;
}

/** Override the API root to point at any OpenAI-compatible endpoint. */
function resolveBaseUrl(): string | undefined {
  return process.env.LLM_BASE_URL ?? process.env.OPENAI_BASE_URL;
}

/** The ground-truth composition for a scenario, used by the mock mode. */
function mockPlanForScenario(scenario: EvalScenario): CompositionPlan {
  const plan: CompositionPlan = {
    objects: [],
    properties: [],
    actions: [],
    interfaces: [],
    intelligence: [],
    rules: [],
  };
  for (const entry of scenario.expectedAtoms) {
    for (const family of PLAN_FAMILIES) {
      if (entry.family === family) plan[family].push(...entry.symbols);
    }
  }
  return plan;
}

/**
 * Score one acceptance criterion. A criterion passes only when the plan
 * actually contains the atoms that satisfy it; the shortfall is reported so a
 * failure says which atom was missing.
 */
function evaluateAcceptance(
  criterion: AcceptanceCriterion,
  plan: CompositionPlan,
): { criterion: string; passed: boolean; missing: string[] } {
  const present = new Set(planSymbols(plan));
  const missing = criterion.requires.filter((symbol) => !present.has(symbol));
  return { criterion: criterion.text, passed: missing.length === 0, missing };
}

function atomsUsedBreakdown(plan: CompositionPlan): { family: Family; symbols: string[] }[] {
  return PLAN_FAMILIES.filter((family) => plan[family]?.length).map((family) => ({
    family,
    symbols: [...new Set(plan[family])],
  }));
}

function evaluateScenario(
  scenario: EvalScenario,
  knownSymbols: Set<string>,
  implemented: Set<string>,
  symbolNames: Map<string, string>,
  plan: CompositionPlan,
  implementationCode: string,
): EvalResult {
  const { withinTable } = checkWithinTable(plan, knownSymbols);

  const planTokenCount = planTokens(plan);
  const implTokens = estimateTokens(implementationCode);
  const nameNormalizedTotal = estimateTokens(nameNormalizedJson(plan, symbolNames)) + implTokens;

  const acceptanceChecks = scenario.acceptanceCriteria.map((c) => evaluateAcceptance(c, plan));
  const fidelity = scoreFidelity(plan, scenario.groundTruthAtoms);
  const atomCount = planSymbols(plan).length;

  const allChecksPass = acceptanceChecks.every((c) => c.passed);
  const unimplementedAtoms = findUnimplementedAtoms(plan, implemented);

  return {
    scenarioId: scenario.id,
    plan,
    atomsUsed: atomsUsedBreakdown(plan),
    atomCount,
    familiesCovered: planFamilies(plan),
    withinTable,
    unimplementedAtoms,
    tokenEstimate: {
      planTokens: planTokenCount,
      implementationTokens: implTokens,
      totalTokens: planTokenCount + implTokens,
      nameNormalizedTotalTokens: nameNormalizedTotal,
    },
    fidelity,
    acceptanceChecks,
    // A plan naming an atom with no implementation cannot be executed, so it is
    // not a valid composition regardless of how well it matches the ground
    // truth. Recency is a defect in the plan, not a property of the harness.
    valid: withinTable && allChecksPass && atomCount >= scenario.minAtomsUsed && unimplementedAtoms.length === 0,
  };
}

interface ComparisonRow {
  scenarioId: string;
  baseline: ArmResult;
  composition: ArmResult;
  overlap: number;
}

interface ArmResult {
  atomCount: number;
  fidelity: FidelityScore;
  acceptancePassed: number;
  acceptanceTotal: number;
  withinTable: boolean;
  tokens: number;
  nameNormalizedTokens: number;
  valid: boolean;
  plan: CompositionPlan;
}

function summarizeArm(plan: CompositionPlan, result: EvalResult): ArmResult {
  return {
    atomCount: result.atomCount,
    fidelity: result.fidelity,
    acceptancePassed: result.acceptanceChecks.filter((c) => c.passed).length,
    acceptanceTotal: result.acceptanceChecks.length,
    withinTable: result.withinTable,
    tokens: result.tokenEstimate.totalTokens,
    nameNormalizedTokens: result.tokenEstimate.nameNormalizedTotalTokens,
    valid: result.valid,
    plan,
  };
}

function pct(numerator: number, denominator: number): string {
  if (denominator === 0) return 'n/a';
  return `${(((denominator - numerator) / denominator) * 100).toFixed(0)}%`;
}

async function runLlmMode(
  knownSymbols: Set<string>,
  implemented: Set<string>,
  symbolNames: Map<string, string>,
  nameIndex: NameIndex,
): Promise<{ results: EvalResult[]; comparisons: ComparisonRow[] }> {
  const { OpenAIProvider } = await import('./llm.js');
  const provider = new OpenAIProvider({ apiKey: resolveApiKey()!, model: resolveModel(), baseUrl: resolveBaseUrl() });
  const ontology = loadOntology();
  const ontologyContext = formatTableSummary(ontology.elements);

  const results: EvalResult[] = [];
  const comparisons: ComparisonRow[] = [];

  for (const scenario of SCENARIOS) {
    console.log(`Scenario: ${scenario.id} (${scenario.title})`);
    try {
      const compositionArm = await provider.generateComposition(scenario.featureRequest, ontologyContext);
      const baselineArm = await provider.generateBaseline(scenario.featureRequest);

      // The composition arm already emits symbols; the baseline emits descriptive
      // names. Resolving the baseline's names within their own family is what
      // lets fidelity score it fairly — a baseline component that coincides with
      // an ontology atom should earn the credit, without being moved into
      // another family to do it.
      const baselinePlan = normalizePlanNames(baselineArm.plan, nameIndex);

      const compositionResult = evaluateScenario(
        scenario,
        knownSymbols,
        implemented,
        symbolNames,
        compositionArm.plan,
        compositionArm.code,
      );
      const baselineResult = evaluateScenario(
        scenario,
        knownSymbols,
        implemented,
        symbolNames,
        baselinePlan,
        baselineArm.code,
      );
      results.push(compositionResult);

      const c = summarizeArm(compositionArm.plan, compositionResult);
      const b = summarizeArm(baselinePlan, baselineResult);
      comparisons.push({
        scenarioId: scenario.id,
        baseline: b,
        composition: c,
        overlap: scoreFidelity(compositionArm.plan, planSymbols(baselinePlan)).recall,
      });

      console.log(
        `  Composition -> ${compositionResult.valid ? 'PASS' : 'FAIL'} | ${compositionResult.atomCount} atoms | recall ${(compositionResult.fidelity.recall * 100).toFixed(0)}% | acceptance ${compositionResult.acceptanceChecks.filter((c) => c.passed).length}/${compositionResult.acceptanceChecks.length} | ${compositionResult.tokenEstimate.totalTokens} tokens (${compositionResult.tokenEstimate.nameNormalizedTotalTokens} name-normalized)`,
      );
      console.log(
        `  Baseline    -> ${baselineResult.valid ? 'PASS' : 'FAIL'} | ${baselineResult.atomCount} atoms | recall ${(baselineResult.fidelity.recall * 100).toFixed(0)}% | acceptance ${baselineResult.acceptanceChecks.filter((c) => c.passed).length}/${baselineResult.acceptanceChecks.length} | ${baselineResult.tokenEstimate.totalTokens} tokens (${baselineResult.tokenEstimate.nameNormalizedTotalTokens} name-normalized)`,
      );
      console.log(
        `  Raw token delta: ${pct(compositionResult.tokenEstimate.totalTokens, baselineResult.tokenEstimate.totalTokens)} | name-normalized: ${pct(compositionResult.tokenEstimate.nameNormalizedTotalTokens, baselineResult.tokenEstimate.nameNormalizedTotalTokens)}\n`,
      );
    } catch (err) {
      console.error(`  ERROR: ${err instanceof Error ? err.message : String(err)}\n`);
    }
  }

  return { results, comparisons };
}

function reportComparisons(comparisons: ComparisonRow[]): void {
  if (comparisons.length === 0) return;

  const arm = (row: ComparisonRow, side: 'composition' | 'baseline'): ArmResult => row[side];
  const mean = (pick: (row: ComparisonRow) => number) =>
    comparisons.reduce((s, c) => s + pick(c), 0) / comparisons.length;
  const total = (pick: (row: ComparisonRow) => number) => comparisons.reduce((s, c) => s + pick(c), 0);

  const recallC = mean((c) => arm(c, 'composition').fidelity.recall);
  const recallB = mean((c) => arm(c, 'baseline').fidelity.recall);
  const acceptC =
    total((c) => arm(c, 'composition').acceptancePassed) / total((c) => arm(c, 'composition').acceptanceTotal);
  const acceptB = total((c) => arm(c, 'baseline').acceptancePassed) / total((c) => arm(c, 'baseline').acceptanceTotal);
  const tokC = total((c) => arm(c, 'composition').tokens);
  const tokB = total((c) => arm(c, 'baseline').tokens);
  const normC = total((c) => arm(c, 'composition').nameNormalizedTokens);
  const normB = total((c) => arm(c, 'baseline').nameNormalizedTokens);

  console.log('='.repeat(72));
  console.log('  Aggregate (composition vs baseline)');
  console.log('='.repeat(72));
  console.log(`  Ground-truth recall:      ${(recallC * 100).toFixed(1)}%  vs  ${(recallB * 100).toFixed(1)}%`);
  console.log(`  Acceptance criteria:      ${(acceptC * 100).toFixed(1)}%  vs  ${(acceptB * 100).toFixed(1)}%`);
  console.log(
    `  Scenarios passing:        ${comparisons.filter((c) => c.composition.valid).length}/${comparisons.length}  vs  ${comparisons.filter((c) => c.baseline.valid).length}/${comparisons.length}`,
  );
  console.log(`  Mean plan recall vs other arm: ${(mean((c) => c.overlap) * 100).toFixed(0)}%`);
  console.log(`  Total tokens, raw:        ${tokC}  vs  ${tokB}  (${pct(tokC, tokB)} saved)`);
  console.log(`  Total tokens, name-norm:   ${normC}  vs  ${normB}  (${pct(normC, normB)} saved)`);
  console.log('='.repeat(72));
  console.log('  Note: `within table` is not a baseline win. The baseline was never given');
  console.log('  the table, so it cannot stay inside it. Fidelity and acceptance are the');
  console.log('  metrics to compare on.\n');
}

async function main(): Promise<void> {
  const ontology = loadOntology();
  const knownSymbols = new Set(ontology.elements.map((e) => e.symbol));
  const symbolNames = symbolToName(ontology);
  const elementBySym = symbolIndex(ontology);
  const implemented = new Set(findAtoms(path.join(REPO_ROOT, 'atoms')).keys());
  const apiKey = resolveApiKey();
  const useLLM = Boolean(apiKey);

  console.log('Software Periodic Table — Evaluation Harness\n');
  console.log(`Ontology loaded: ${ontology.elements.length} elements, ${SCENARIOS.length} scenarios`);
  console.log(`Atoms with reference implementations: ${implemented.size}/${ontology.elements.length}\n`);

  if (useLLM) {
    console.log(`Mode: LLM (${resolveModel() ?? 'gpt-4o'}) — baseline vs composition\n`);
    const { results, comparisons } = await runLlmMode(knownSymbols, implemented, symbolNames, buildNameIndex(ontology));
    if (results.length > 0) {
      console.log(summarizeResults(results));
      reportComparisons(comparisons);
    } else {
      console.error('No scenario completed. Check the API key and model name.');
      process.exit(1);
    }
    fs.writeFileSync(
      path.resolve(REPO_ROOT, 'eval-results.json'),
      JSON.stringify({ mode: 'llm', results, comparisons }, null, 2),
    );
    return;
  }

  // Mock mode replays each scenario's own ground truth. That makes it a check of
  // the harness and the ontology, not a measurement of model behaviour: every
  // plan is within the table by construction, so recall is 1.0 and acceptance
  // passes by definition. Real numbers require an API key.
  console.log("Mode: mock — replays each scenario's ground-truth plan.");
  console.log('This validates the harness and the ontology. It measures no model behaviour,');
  console.log('and its fidelity and token figures are not evidence of anything.\n');

  const results: EvalResult[] = [];
  for (const scenario of SCENARIOS) {
    const plan = mockPlanForScenario(scenario);
    const result = evaluateScenario(scenario, knownSymbols, implemented, symbolNames, plan, '');
    results.push(result);
    console.log(
      `${scenario.id.padEnd(24)} ${result.valid ? 'PASS' : 'FAIL'} | atoms ${String(result.atomCount).padStart(2)} | acceptance ${result.acceptanceChecks.filter((c) => c.passed).length}/${result.acceptanceChecks.length}`,
    );
  }

  console.log(`\n${summarizeResults(results)}`);

  const unimplementedUsed = new Set(results.flatMap((r) => r.unimplementedAtoms));
  if (unimplementedUsed.size > 0) {
    console.log('Atoms used by the scenarios that have no reference implementation:');
    for (const symbol of [...unimplementedUsed].sort()) {
      const element = elementBySym.get(symbol);
      console.log(`  ${String(element?.id).padStart(3)} ${symbol} ${element?.name} (${element?.family})`);
    }
    console.log('');
  }

  const outPath = path.resolve(REPO_ROOT, 'eval-results.json');
  fs.writeFileSync(outPath, JSON.stringify({ mode: 'mock', results }, null, 2));
  console.log(`Full results written to ${outPath}`);

  if (results.some((r) => !r.valid)) {
    console.error('\nMock self-check failed: the ground-truth plan did not satisfy its own scenario.');
    process.exit(1);
  }
}

main();
