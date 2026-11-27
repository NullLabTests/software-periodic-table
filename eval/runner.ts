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
 *
 * There is no token or character metric. An earlier version reported one, and it
 * was withdrawn: `chars/4` was measured against a real tokenizer at −21% on
 * symbol plans and +9% on name-expanded plans, so the apparent notation saving
 * was an artifact of the estimator rather than a property of the plans. See
 * docs/EVAL_RESULTS.md. Plan length is not reported as a proxy for cost.
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
import { buildNameIndex, loadOntology, type NameIndex, symbolIndex } from '../src/ontology.js';
import {
  type AggregateResult,
  aggregateRepeats,
  type CompositionPlan,
  checkWithinTable,
  distinctPlanSymbols,
  EMPTY_FIDELITY,
  type EvalResult,
  type Family,
  type FidelityScore,
  findMisfiledNames,
  findUnimplementedAtoms,
  mean,
  normalizePlanNames,
  PLAN_FAMILIES,
  planFamilies,
  planOverlap,
  planSymbols,
  scoreFidelity,
  summarizeAggregates,
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

/** Force the Responses API or Chat Completions instead of inferring from the host. */
function resolveApi(): 'responses' | 'chat' | undefined {
  const raw = process.env.LLM_API?.toLowerCase();
  return raw === 'responses' || raw === 'chat' ? raw : undefined;
}

/** Total attempts per request, including the first. */
function resolveAttempts(): number | undefined {
  const raw = Number.parseInt(process.env.LLM_MAX_ATTEMPTS ?? '', 10);
  return Number.isFinite(raw) && raw > 0 ? raw : undefined;
}

/** Per-request timeout in milliseconds. */
function resolveTimeout(): number | undefined {
  const raw = Number.parseInt(process.env.LLM_TIMEOUT_MS ?? '', 10);
  return Number.isFinite(raw) && raw > 0 ? raw : undefined;
}

/**
 * Independent samples per scenario. One sample cannot tell a reliable result
 * apart from a lucky draw, so the default is three.
 */
function resolveRepeats(): number {
  const raw = Number.parseInt(process.env.EVAL_REPEATS ?? '3', 10);
  return Number.isFinite(raw) && raw > 0 ? raw : 3;
}

function emptyPlan(): CompositionPlan {
  return { objects: [], properties: [], actions: [], interfaces: [], intelligence: [], rules: [] };
}

/** The ground-truth composition for a scenario, used by the mock mode. */
function mockPlanForScenario(scenario: EvalScenario): CompositionPlan {
  const plan = emptyPlan();
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
  nameIndex: NameIndex,
  plan: CompositionPlan,
  arm: EvalResult['arm'],
): EvalResult {
  const { withinTable } = checkWithinTable(plan, knownSymbols);

  const acceptanceChecks = scenario.acceptanceCriteria.map((c) => evaluateAcceptance(c, plan));
  const fidelity = scoreFidelity(plan, scenario.groundTruthAtoms);
  const atomCount = distinctPlanSymbols(plan).length;

  const allChecksPass = acceptanceChecks.every((c) => c.passed);
  const unimplementedAtoms = findUnimplementedAtoms(plan, implemented);
  const misfiledNames = findMisfiledNames(plan, nameIndex);

  return {
    scenarioId: scenario.id,
    arm,
    plan,
    atomsUsed: atomsUsedBreakdown(plan),
    atomCount,
    familiesCovered: planFamilies(plan),
    withinTable,
    unimplementedAtoms,
    misfiledNames,
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
  valid: boolean;
  plan: CompositionPlan;
}

/**
 * Collapse repeated samples for one arm into the numbers the comparison table
 * shows. Recall and precision are averaged; `valid` and `withinTable` require
 * every sample to pass, so a single bad repeat cannot read as a clean result.
 */
function averageArm(samples: EvalResult[]): ArmResult {
  const last = samples[samples.length - 1]!;
  const atomCount = mean(samples.map((sample) => sample.atomCount));
  return {
    atomCount: Math.round(atomCount * 10) / 10,
    fidelity: {
      ...last.fidelity,
      recall: mean(samples.map((sample) => sample.fidelity.recall)),
      precision: mean(samples.map((sample) => sample.fidelity.precision)),
    },
    acceptancePassed: mean(samples.map((sample) => sample.acceptanceChecks.filter((c) => c.passed).length)),
    acceptanceTotal: last.acceptanceChecks.length,
    withinTable: samples.every((sample) => sample.withinTable),
    valid: samples.every((sample) => sample.valid),
    plan: last.plan,
  };
}

/** Human-readable one-line score for one arm of one scenario. */
function formatArm(label: string, r: EvalResult): string {
  return (
    `  ${label.padEnd(12)} ${r.valid ? 'PASS' : 'FAIL'} | atoms ${String(r.atomCount).padStart(2)} | ` +
    `recall ${(r.fidelity.recall * 100).toFixed(0)}% | ` +
    `acceptance ${r.acceptanceChecks.filter((c) => c.passed).length}/${r.acceptanceChecks.length}`
  );
}

async function runLlmMode(
  knownSymbols: Set<string>,
  implemented: Set<string>,
  nameIndex: NameIndex,
): Promise<{ results: EvalResult[]; comparisons: ComparisonRow[]; aggregates: AggregateResult[] }> {
  const { OpenAIProvider } = await import('./llm.js');
  const provider = new OpenAIProvider({
    apiKey: resolveApiKey()!,
    model: resolveModel(),
    baseUrl: resolveBaseUrl(),
    api: resolveApi(),
    maxAttempts: resolveAttempts(),
    timeoutMs: resolveTimeout(),
  });
  const ontology = loadOntology();
  const ontologyContext = formatTableSummary(ontology.elements);
  const repeats = resolveRepeats();

  const results: EvalResult[] = [];
  const comparisons: ComparisonRow[] = [];
  const aggregates: AggregateResult[] = [];

  for (const scenario of SCENARIOS) {
    console.log(`Scenario: ${scenario.id} (${scenario.title})`);
    const compositionSamples: EvalResult[] = [];
    const baselineSamples: EvalResult[] = [];

    const recordError = (arm: EvalResult['arm'], err: unknown, repeat: number): void => {
      // Recorded rather than swallowed: a failed sample used to shrink N with no
      // trace in the output, which made a partial run look like a complete one.
      const message = err instanceof Error ? err.message : String(err);
      console.error(`  [${repeat}/${repeats}] ${arm} ERROR: ${message}`);
      results.push({
        scenarioId: scenario.id,
        arm,
        plan: emptyPlan(),
        atomsUsed: [],
        atomCount: 0,
        familiesCovered: [],
        withinTable: false,
        unimplementedAtoms: [],
        misfiledNames: [],
        fidelity: EMPTY_FIDELITY,
        acceptanceChecks: [],
        valid: false,
        error: message,
      });
    };

    for (let repeat = 1; repeat <= repeats; repeat++) {
      try {
        const arm = await provider.generateComposition(scenario.featureRequest, ontologyContext);
        const result = evaluateScenario(scenario, knownSymbols, implemented, nameIndex, arm.plan, 'composition');
        compositionSamples.push(result);
        results.push(result);
        console.log(`  [${repeat}/${repeats}] ${formatArm('Composition', result).trim()}`);
      } catch (err) {
        recordError('composition', err, repeat);
      }

      try {
        const arm = await provider.generateBaseline(scenario.featureRequest);
        // The composition arm already emits symbols; the baseline emits
        // descriptive names. Resolving the baseline's names within their own
        // family is what lets fidelity score it fairly — a baseline component
        // that coincides with an ontology atom should earn the credit, without
        // being moved into another family to do it.
        const baselinePlan = normalizePlanNames(arm.plan, nameIndex);
        const result = evaluateScenario(scenario, knownSymbols, implemented, nameIndex, baselinePlan, 'baseline');
        baselineSamples.push(result);
        results.push(result);
        console.log(`  [${repeat}/${repeats}] ${formatArm('Baseline', result).trim()}`);
      } catch (err) {
        recordError('baseline', err, repeat);
      }
    }

    if (compositionSamples.length > 0 && baselineSamples.length > 0) {
      // Pair every composition sample with every baseline sample rather than by
      // index: a failed repeat on one side would otherwise shift the pairing.
      const overlaps = compositionSamples.flatMap((composition) =>
        baselineSamples.map((baseline) => planOverlap(composition.plan, baseline.plan)),
      );
      comparisons.push({
        scenarioId: scenario.id,
        baseline: averageArm(baselineSamples),
        composition: averageArm(compositionSamples),
        overlap: mean(overlaps),
      });
    }

    if (compositionSamples.length > 0) {
      aggregates.push(aggregateRepeats(scenario.id, compositionSamples));
    }
    if (baselineSamples.length > 0) {
      aggregates.push(aggregateRepeats(scenario.id, baselineSamples));
    }

    for (const result of [...compositionSamples, ...baselineSamples]) {
      if (result.misfiledNames.length > 0) {
        console.log(
          `  ${result.arm === 'baseline' ? 'Baseline   ' : 'Composition'} misfiled: ` +
            result.misfiledNames.map((m) => `${m.name} in ${m.family} -> ${m.expectedSymbol}`).join(', '),
        );
      }
    }
    console.log('');
  }

  return { results, comparisons, aggregates };
}

function reportComparisons(comparisons: ComparisonRow[]): void {
  if (comparisons.length === 0) return;

  const arm = (row: ComparisonRow, side: 'composition' | 'baseline'): ArmResult => row[side];
  const average = (pick: (row: ComparisonRow) => number) =>
    comparisons.reduce((s, c) => s + pick(c), 0) / comparisons.length;
  const sum = (pick: (row: ComparisonRow) => number) => comparisons.reduce((s, c) => s + pick(c), 0);

  const recallC = average((c) => arm(c, 'composition').fidelity.recall);
  const recallB = average((c) => arm(c, 'baseline').fidelity.recall);
  const acceptC =
    sum((c) => arm(c, 'composition').acceptancePassed) / sum((c) => arm(c, 'composition').acceptanceTotal);
  const acceptB = sum((c) => arm(c, 'baseline').acceptancePassed) / sum((c) => arm(c, 'baseline').acceptanceTotal);

  console.log('='.repeat(72));
  console.log('  Aggregate (composition vs baseline)');
  console.log('='.repeat(72));
  console.log(`  Ground-truth recall:      ${(recallC * 100).toFixed(1)}%  vs  ${(recallB * 100).toFixed(1)}%`);
  console.log(`  Acceptance criteria:      ${(acceptC * 100).toFixed(1)}%  vs  ${(acceptB * 100).toFixed(1)}%`);
  console.log(
    `  Scenarios passing:        ${comparisons.filter((c) => c.composition.valid).length}/${comparisons.length}  vs  ${comparisons.filter((c) => c.baseline.valid).length}/${comparisons.length}`,
  );
  console.log(`  Mean plan overlap:        ${(average((c) => c.overlap) * 100).toFixed(0)}%`);
  console.log('='.repeat(72));
  console.log('  Notes:');
  console.log('  - `within table` is not a baseline win. The baseline was never given');
  console.log('    the table, so it cannot stay inside it.');
  console.log('  - Acceptance is a per-criterion restatement of the ground-truth atom');
  console.log('    set, so it is not independent evidence alongside recall.');
  console.log('  - No token or character metric is reported; see docs/EVAL_RESULTS.md.\n');
}

async function main(): Promise<void> {
  const ontology = loadOntology();
  const knownSymbols = new Set(ontology.elements.map((e) => e.symbol));
  const nameIndex = buildNameIndex(ontology);
  const elementBySym = symbolIndex(ontology);
  const implemented = new Set(findAtoms(path.join(REPO_ROOT, 'atoms')).keys());
  const apiKey = resolveApiKey();
  const useLLM = Boolean(apiKey);

  console.log('Software Periodic Table — Evaluation Harness\n');
  console.log(`Ontology loaded: ${ontology.elements.length} elements, ${SCENARIOS.length} scenarios`);
  console.log(`Atoms with reference implementations: ${implemented.size}/${ontology.elements.length}\n`);

  if (useLLM) {
    const repeats = resolveRepeats();
    console.log(`Mode: LLM (${resolveModel() ?? 'gpt-4o'}) — baseline vs composition`);
    console.log(`Repeats per scenario: ${repeats}\n`);
    const { results, comparisons, aggregates } = await runLlmMode(knownSymbols, implemented, nameIndex);
    if (results.some((result) => result.error === undefined)) {
      console.log(summarizeResults(results));
      if (aggregates.length > 0) console.log(summarizeAggregates(aggregates));
      reportComparisons(comparisons);
    } else {
      console.error('No scenario completed. Check the API key and model name.');
      process.exit(1);
    }
    fs.writeFileSync(
      path.resolve(REPO_ROOT, 'eval-results.json'),
      JSON.stringify({ mode: 'llm', repeats, results, comparisons, aggregates }, null, 2),
    );
    const aggregatePath = path.resolve(REPO_ROOT, 'eval-results.aggregate.json');
    fs.writeFileSync(aggregatePath, JSON.stringify(aggregates, null, 2));
    console.log(`Aggregate results written to ${aggregatePath}`);
    return;
  }

  // Mock mode replays each scenario's own ground truth. That makes it a check of
  // the harness and the ontology, not a measurement of model behaviour: every
  // plan is within the table by construction, so recall is 1.0 and acceptance
  // passes by definition. Real numbers require an API key.
  console.log("Mode: mock — replays each scenario's ground-truth plan.");
  console.log('This validates the harness and the ontology. It measures no model behaviour,');
  console.log('and its fidelity figures are not evidence of anything.\n');

  const results: EvalResult[] = [];
  for (const scenario of SCENARIOS) {
    const plan = mockPlanForScenario(scenario);
    const result = evaluateScenario(scenario, knownSymbols, implemented, nameIndex, plan, 'composition');
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
