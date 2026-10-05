/**
 * Sub-agent evaluation harness.
 *
 * The provider-agnostic sibling of `runner.ts`: instead of calling an API, it
 * prints the two prompts a sub-agent should receive, then compares whatever the
 * two agents wrote to disk. Useful for comparing different agents, or for
 * running an experiment that should not cost API calls.
 *
 * Usage:
 *   npx tsx eval/agent-eval.ts baseline      # print the baseline agent prompt
 *   npx tsx eval/agent-eval.ts composition   # print the composition agent prompt
 *   npx tsx eval/agent-eval.ts compare       # score both saved result files
 *
 * Each agent is asked for the same two artefacts — a component breakdown and the
 * code that realises it — so fidelity, acceptance and token counts are measured
 * over comparable things. The arms differ only in what they are told.
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import { COMPOSITION_SYSTEM_PROMPT, formatTableSummary } from '../composer/prompt.js';
import { findAtoms } from '../scripts/coverage.js';
import { buildNameIndex, loadOntology, type NameIndex, REPO_ROOT, symbolToName } from '../src/ontology.js';
import {
  type CompositionPlan,
  checkWithinTable,
  distinctPlanSymbols,
  estimateTokens,
  findUnimplementedAtoms,
  nameNormalizedJson,
  normalizePlanNames,
  planFamilies,
  planOverlap,
  planSymbols,
  planTokens,
  scoreFidelity,
} from './metrics.js';
import { SCENARIOS } from './scenarios.js';

// Root, not eval/: these are generated artefacts and eval/ is source.
const BASELINE_OUT = process.env.SPT_BASELINE_OUT ?? path.resolve(REPO_ROOT, 'baseline-results.json');
const COMPOSITION_OUT = process.env.SPT_COMPOSITION_OUT ?? path.resolve(REPO_ROOT, 'composition-results.json');

interface ScenarioResult {
  id: string;
  objects: string[];
  properties: string[];
  actions: string[];
  interfaces: string[];
  intelligence: string[];
  rules: string[];
  notes?: string;
  code?: string;
}

interface BatchResults {
  results: ScenarioResult[];
}

function featureRequestsText(): string {
  return SCENARIOS.map((s) => `  - id: "${s.id}"\n  Feature: "${s.featureRequest.replace(/"/g, "'")}"`).join('\n\n');
}

const OUTPUT_CONTRACT = `IMPORTANT: Output ONLY valid JSON. No explanation, no markdown fence around the whole thing.

Each entry needs:
  - "id": the scenario id
  - "objects", "properties", "actions", "interfaces", "intelligence", "rules": string arrays
  - "notes": one short sentence of rationale (optional)
  - "code": the code that realises the plan

Wrap all entries in: { "results": [ ... ] }`;

export function generateBaselinePrompt(): string {
  return `You are a senior software engineer. For each feature request below, plan what software components you would build, then write the code.

Use ordinary descriptive names for the components you create — the names you would give them in a real codebase.

${OUTPUT_CONTRACT}

Then write the exact same JSON to ${BASELINE_OUT}.

${featureRequestsText()}
`;
}

export function generateCompositionPrompt(): string {
  const ontology = loadOntology();
  return `You are a software composition agent using the Software Periodic Table.

The table defines ${ontology.elements.length} reusable software elements with 2-character symbols. Compose from it rather than inventing new components.

${COMPOSITION_SYSTEM_PROMPT}

${formatTableSummary(ontology.elements)}

Emit composition plans using atom SYMBOLS only (for example "Tk" for Task, "Us" for User, "Ss" for Status, "Cr" for Create). Do not invent names that are not in the table.

${OUTPUT_CONTRACT}

Then write the exact same JSON to ${COMPOSITION_OUT}.

${featureRequestsText()}
`;
}

interface ArmScore {
  scenarioId: string;
  atomCount: number;
  families: string[];
  tokens: number;
  nameNormalizedTokens: number;
  withinTable: boolean;
  violations: string[];
  unimplemented: string[];
  recall: number;
  precision: number;
  acceptancePassed: number;
  acceptanceTotal: number;
  plan: CompositionPlan;
  code: string;
}

function scoreArm(
  results: ScenarioResult[],
  nameIndex: NameIndex,
  symbolNames: Map<string, string>,
  knownSymbols: Set<string>,
  implemented: Set<string>,
  normalize: boolean,
): Map<string, ArmScore> {
  const scored = new Map<string, ArmScore>();

  for (const raw of results) {
    const source: CompositionPlan = {
      objects: raw.objects ?? [],
      properties: raw.properties ?? [],
      actions: raw.actions ?? [],
      interfaces: raw.interfaces ?? [],
      intelligence: raw.intelligence ?? [],
      rules: raw.rules ?? [],
      ...(raw.notes ? { notes: raw.notes } : {}),
    };
    // The composition arm already emits symbols, so normalizing is a no-op
    // there. The baseline emits names, and resolving each within its own family
    // is what lets it be scored on equal terms.
    const plan = normalize ? normalizePlanNames(source, nameIndex) : source;

    const scenario = SCENARIOS.find((s) => s.id === raw.id);
    const { withinTable, violations } = checkWithinTable(plan, knownSymbols);
    const fidelity = scoreFidelity(plan, scenario?.groundTruthAtoms ?? []);
    const code = raw.code ?? '';
    const passed = (scenario?.acceptanceCriteria ?? []).filter((c) => {
      const present = new Set(planSymbols(plan));
      return c.requires.every((symbol) => present.has(symbol));
    }).length;

    scored.set(raw.id, {
      scenarioId: raw.id,
      atomCount: distinctPlanSymbols(plan).length,
      families: planFamilies(plan),
      tokens: planTokens(plan) + estimateTokens(code),
      nameNormalizedTokens: estimateTokens(nameNormalizedJson(plan, symbolNames)) + estimateTokens(code),
      withinTable,
      violations,
      unimplemented: findUnimplementedAtoms(plan, implemented),
      recall: fidelity.recall,
      precision: fidelity.precision,
      acceptancePassed: passed,
      acceptanceTotal: scenario?.acceptanceCriteria.length ?? 0,
      plan,
      code,
    });
  }

  return scored;
}

function compareResults(): void {
  for (const file of [BASELINE_OUT, COMPOSITION_OUT]) {
    if (!fs.existsSync(file)) {
      console.error(`Missing ${file}. Generate it with:`);
      console.error(
        file === BASELINE_OUT
          ? '  npx tsx eval/agent-eval.ts baseline    # then give that prompt to the baseline agent'
          : '  npx tsx eval/agent-eval.ts composition # then give that prompt to the composition agent',
      );
      process.exit(1);
    }
  }

  const ontology = loadOntology();
  const knownSymbols = new Set(ontology.elements.map((e) => e.symbol));
  const implemented = new Set(findAtoms(path.join(REPO_ROOT, 'atoms')).keys());
  const symbolNames = symbolToName(ontology);
  const nameIndex = buildNameIndex(ontology);

  const baselineRaw = JSON.parse(fs.readFileSync(BASELINE_OUT, 'utf-8')) as BatchResults;
  const compositionRaw = JSON.parse(fs.readFileSync(COMPOSITION_OUT, 'utf-8')) as BatchResults;

  const baseline = scoreArm(baselineRaw.results, nameIndex, symbolNames, knownSymbols, implemented, true);
  const composition = scoreArm(compositionRaw.results, nameIndex, symbolNames, knownSymbols, implemented, false);

  const rows: {
    scenarioId: string;
    baseline: ArmScore;
    composition: ArmScore;
    overlap: number;
  }[] = [];

  console.log('='.repeat(78));
  console.log('  Software Periodic Table — Sub-agent Evaluation');
  console.log('='.repeat(78));
  console.log(`  Scenarios: baseline ${baselineRaw.results.length}, composition ${compositionRaw.results.length}\n`);

  for (const scenario of SCENARIOS) {
    const b = baseline.get(scenario.id);
    const c = composition.get(scenario.id);
    if (!b || !c) {
      console.log(`  ${scenario.id}: missing from ${!b ? 'baseline' : 'composition'} results — skipped\n`);
      continue;
    }
    const overlap = planOverlap(c.plan, b.plan);
    rows.push({ scenarioId: scenario.id, baseline: b, composition: c, overlap });

    const line = (label: string, arm: ArmScore) =>
      `  │  ${label.padEnd(12)} atoms ${String(arm.atomCount).padStart(2)} │ recall ${(arm.recall * 100)
        .toFixed(0)
        .padStart(3)}% │ accept ${String(arm.acceptancePassed).padStart(2)}/${arm.acceptanceTotal} │ ` +
      `${String(arm.tokens).padStart(5)} tok (${String(arm.nameNormalizedTokens).padStart(5)} name-norm)`;

    console.log(`  ┌─ ${scenario.id}`);
    console.log(`  │`);
    console.log(line('Baseline', b));
    console.log(line('Composition', c));
    if (c.violations.length > 0) console.log(`  │  ${' '.repeat(12)} not in table: ${c.violations.join(', ')}`);
    if (c.unimplemented.length > 0)
      console.log(`  │  ${' '.repeat(12)} no implementation: ${c.unimplemented.join(', ')}`);
    console.log(`  │  overlap: ${(overlap * 100).toFixed(0)}%`);
    console.log(`  └─`);
    console.log();
  }

  if (rows.length === 0) {
    console.error('No scenario appeared in both result files.');
    process.exit(1);
  }

  const sum = (pick: (row: (typeof rows)[number]) => number) => rows.reduce((s, r) => s + pick(r), 0);
  const mean = (pick: (row: (typeof rows)[number]) => number) => sum(pick) / rows.length;
  const rate = (num: number, den: number) => (den === 0 ? 'n/a' : `${((1 - num / den) * 100).toFixed(1)}%`);

  const tokC = sum((r) => r.composition.tokens);
  const tokB = sum((r) => r.baseline.tokens);
  const normC = sum((r) => r.composition.nameNormalizedTokens);
  const normB = sum((r) => r.baseline.nameNormalizedTokens);

  console.log('='.repeat(78));
  console.log('  SUMMARY');
  console.log('='.repeat(78));
  console.log(
    `  Mean ground-truth recall:   composition ${(mean((r) => r.composition.recall) * 100).toFixed(1)}%  |  baseline ${(mean((r) => r.baseline.recall) * 100).toFixed(1)}%`,
  );
  console.log(
    `  Acceptance criteria met:    composition ${(mean((r) => r.composition.acceptancePassed / Math.max(1, r.composition.acceptanceTotal)) * 100).toFixed(1)}%  |  baseline ${(mean((r) => r.baseline.acceptancePassed / Math.max(1, r.baseline.acceptanceTotal)) * 100).toFixed(1)}%`,
  );
  console.log(
    `  Scenarios fully in table:    ${rows.filter((r) => r.composition.withinTable).length}/${rows.length} composition, ${rows.filter((r) => r.baseline.withinTable).length}/${rows.length} baseline`,
  );
  console.log(`  Mean plan overlap:           ${(mean((r) => r.overlap) * 100).toFixed(0)}%`);
  console.log(`  Total tokens, raw:           ${tokC} composition vs ${tokB} baseline (${rate(tokC, tokB)} lower)`);
  console.log(
    `  Total tokens, name-norm:      ${normC} composition vs ${normB} baseline (${rate(normC, normB)} lower)`,
  );
  console.log('='.repeat(78));
  console.log('  Raw token counts reward 2-char symbols over descriptive names by');
  console.log('  construction. The name-normalized row is the fairer comparison.');
  console.log('  `within table` is not a baseline win: the baseline never saw the table.\n');

  const outPath = path.resolve(REPO_ROOT, 'agent-eval-results.json');
  fs.writeFileSync(
    outPath,
    JSON.stringify(
      {
        summary: {
          scenarios: rows.length,
          meanCompositionRecall: mean((r) => r.composition.recall),
          meanBaselineRecall: mean((r) => r.baseline.recall),
          totalCompositionTokens: tokC,
          totalBaselineTokens: tokB,
          totalCompositionTokensNameNormalized: normC,
          totalBaselineTokensNameNormalized: normB,
          meanOverlap: mean((r) => r.overlap),
        },
        comparisons: rows,
      },
      null,
      2,
    ),
  );
  console.log(`Full results written to ${outPath}`);
}

function main(): void {
  const mode = process.argv[2];
  switch (mode) {
    case 'baseline':
    case 'baseline-prompt':
      console.log(generateBaselinePrompt());
      break;
    case 'composition':
    case 'composition-prompt':
      console.log(generateCompositionPrompt());
      break;
    case 'compare':
      compareResults();
      break;
    default:
      console.log('Usage:');
      console.log('  npx tsx eval/agent-eval.ts baseline    → print the baseline subagent prompt');
      console.log('  npx tsx eval/agent-eval.ts composition → print the composition subagent prompt');
      console.log('  npx tsx eval/agent-eval.ts compare     → score both saved result files');
  }
}

main();
