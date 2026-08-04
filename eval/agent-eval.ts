import * as fs from 'node:fs';
import * as path from 'node:path';
import { COMPOSITION_SYSTEM_PROMPT, formatTableSummary } from '../composer/prompt.js';
import { type CompositionPlan, checkWithinTable, type EvalResult, estimateTokens, planOverlap } from './metrics.js';
import { SCENARIOS } from './scenarios.js';

const __dirname = new URL('.', import.meta.url).pathname;
const ONTOLOGY_PATH = path.resolve(__dirname, '../ontology/periodic-table.json');
const BASELINE_OUT = '/tmp/opencode/baseline-results.json';
const COMPOSITION_OUT = '/tmp/opencode/composition-results.json';

interface OntologyElement {
  id: number;
  symbol: string;
  name: string;
  family: string;
  description: string;
}
interface Ontology {
  elements: OntologyElement[];
}
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

function loadOntology(): Ontology {
  return JSON.parse(fs.readFileSync(ONTOLOGY_PATH, 'utf-8')) as Ontology;
}

function featureRequestsText(): string {
  return SCENARIOS.map((s) => `  - id: "${s.id}"\n  Feature: "${s.featureRequest.replace(/"/g, "'")}"`).join('\n\n');
}

export function generateBaselinePrompt(): string {
  return `You are a senior software engineer. For each feature request below, plan what software components you would build.

IMPORTANT: Output ONLY valid JSON. No explanation, no markdown, no code fences.

For each feature request, output an object with these fields:
  - "id": the scenario id
  - "objects": list of entity/noun names you would model (e.g. ["Task", "User"])
  - "properties": list of field/attribute names (e.g. ["Status", "Priority", "Owner"])
  - "actions": list of operations (e.g. ["Create", "Update", "View", "Assign"])
  - "interfaces": list of UI views (e.g. ["Table", "Kanban", "Form"])
  - "intelligence": list of AI features needed (e.g. ["Search", "Recommend"])
  - "rules": list of governance rules (e.g. ["Permission", "Audit"])
  - "notes": brief rationale (optional)
  - "code": a short snippet showing the core data model (optional)

Wrap all results in: { "results": [ ... ] }

Then write the exact same JSON to the file /tmp/opencode/baseline-results.json using the shell.

${featureRequestsText()}
`;
}

export function generateCompositionPrompt(): string {
  const ontology = loadOntology();
  const summary = formatTableSummary(ontology.elements);
  return `You are a software composition agent using the Software Periodic Table.

Read the ontology file at ontology/periodic-table.json — it defines 115 reusable software atoms with 2-character symbols.

${COMPOSITION_SYSTEM_PROMPT}

${summary}

For each feature request below, emit a composition plan using atom SYMBOLS only (e.g. "Tk" for Task, "Us" for User, "Ss" for Status, "Cr" for Create).

IMPORTANT: Output ONLY valid JSON. No explanation, no markdown, no code fences.

Each plan object:
  - "id": scenario id
  - "objects": atom symbol array (e.g. ["Tk", "Us"])
  - "properties": atom symbol array
  - "actions": atom symbol array
  - "interfaces": atom symbol array
  - "intelligence": atom symbol array
  - "rules": atom symbol array
  - "code": brief wiring code using the atoms (optional)

Wrap all in: { "results": [ ... ] }

Then write the exact same JSON to the file /tmp/opencode/composition-results.json using the shell.

${featureRequestsText()}
`;
}

function buildNameToSymbol(elements: OntologyElement[]): Map<string, string> {
  const map = new Map<string, string>();
  for (const el of elements) {
    map.set(el.name.toLowerCase(), el.symbol);
    map.set(el.symbol, el.symbol);
  }
  return map;
}

interface ComparedResult {
  scenarioId: string;
  baseline: {
    atomCount: number;
    families: string[];
    tokens: number;
    withinTable: boolean;
    valid: boolean;
    plan: CompositionPlan;
  };
  composition: {
    atomCount: number;
    families: string[];
    tokens: number;
    withinTable: boolean;
    valid: boolean;
    plan: CompositionPlan;
  };
  overlap: number;
  tokenSavings: number;
  tokenSavingsPercent: string;
}

function normalizePlan(result: ScenarioResult, nameToSymbol: Map<string, string>): CompositionPlan {
  const toSymbol = (items: string[]) => items.map((i) => nameToSymbol.get(i.toLowerCase()) ?? i);
  return {
    objects: toSymbol(result.objects),
    properties: toSymbol(result.properties),
    actions: toSymbol(result.actions),
    interfaces: toSymbol(result.interfaces),
    intelligence: toSymbol(result.intelligence),
    rules: toSymbol(result.rules),
    notes: result.notes,
  };
}

function validateAndScore(
  results: ScenarioResult[],
  knownSymbols: Set<string>,
  nameToSymbol: Map<string, string>,
): { results: EvalResult[]; totalTokens: number } {
  const evalResults: EvalResult[] = [];
  let totalTokens = 0;

  for (const r of results) {
    const plan = normalizePlan(r, nameToSymbol);
    const { withinTable } = checkWithinTable(plan, knownSymbols);

    const planStr = JSON.stringify(plan);
    const implStr = r.code ?? '';
    const planTokens = estimateTokens(planStr);
    const implTokens = estimateTokens(implStr);
    const total = planTokens + implTokens;
    totalTokens += total;

    const familiesCovered: string[] = [];
    if (plan.objects.length > 0) familiesCovered.push('objects');
    if (plan.properties.length > 0) familiesCovered.push('properties');
    if (plan.actions.length > 0) familiesCovered.push('actions');
    if (plan.interfaces.length > 0) familiesCovered.push('interfaces');
    if (plan.intelligence.length > 0) familiesCovered.push('intelligence');
    if (plan.rules.length > 0) familiesCovered.push('rules');

    const scenario = SCENARIOS.find((s) => s.id === r.id);
    const atomCount = [
      ...plan.objects,
      ...plan.properties,
      ...plan.actions,
      ...plan.interfaces,
      ...plan.intelligence,
      ...plan.rules,
    ].length;
    const minOk = scenario ? atomCount >= scenario.minAtomsUsed : true;

    evalResults.push({
      scenarioId: r.id,
      plan,
      atomsUsed: [],
      atomCount,
      familiesCovered: familiesCovered as EvalResult['familiesCovered'],
      withinTable,
      tokenEstimate: { planTokens, implementationTokens: implTokens, totalTokens: total },
      acceptanceChecks: [],
      valid: withinTable && minOk,
    });
  }

  return { results: evalResults, totalTokens };
}

function compareResults(): void {
  if (!fs.existsSync(BASELINE_OUT) || !fs.existsSync(COMPOSITION_OUT)) {
    console.error('Missing result files. Run baseline and composition subagents first.');
    console.error(`  Expected: ${BASELINE_OUT} and ${COMPOSITION_OUT}`);
    process.exit(1);
  }

  const ontology = loadOntology();
  const knownSymbols = new Set(ontology.elements.map((e) => e.symbol));
  const nameToSymbol = buildNameToSymbol(ontology.elements);

  const baselineRaw = JSON.parse(fs.readFileSync(BASELINE_OUT, 'utf-8')) as BatchResults;
  const compositionRaw = JSON.parse(fs.readFileSync(COMPOSITION_OUT, 'utf-8')) as BatchResults;

  const baselineScored = validateAndScore(baselineRaw.results, knownSymbols, nameToSymbol);
  const compositionScored = validateAndScore(compositionRaw.results, knownSymbols, nameToSymbol);

  const compared: ComparedResult[] = [];
  for (const b of baselineScored.results) {
    const c = compositionScored.results.find((r) => r.scenarioId === b.scenarioId);
    if (!c) continue;
    const overlap = planOverlap(b.plan, c.plan);
    const tokenSavings = b.tokenEstimate.totalTokens - c.tokenEstimate.totalTokens;
    compared.push({
      scenarioId: b.scenarioId,
      baseline: {
        atomCount: b.atomCount,
        families: b.familiesCovered,
        tokens: b.tokenEstimate.totalTokens,
        withinTable: b.withinTable,
        valid: b.valid,
        plan: b.plan,
      },
      composition: {
        atomCount: c.atomCount,
        families: c.familiesCovered,
        tokens: c.tokenEstimate.totalTokens,
        withinTable: c.withinTable,
        valid: c.valid,
        plan: c.plan,
      },
      overlap,
      tokenSavings,
      tokenSavingsPercent:
        tokenSavings > 0
          ? `-${((1 - c.tokenEstimate.totalTokens / b.tokenEstimate.totalTokens) * 100).toFixed(0)}%`
          : `+${((c.tokenEstimate.totalTokens / b.tokenEstimate.totalTokens - 1) * 100).toFixed(0)}%`,
    });
  }

  console.log('═'.repeat(60));
  console.log('  Software Periodic Table — Agent Evaluation Results');
  console.log('═'.repeat(60));
  console.log(`  Mode: Sub-agent (${baselineRaw.results.length} scenarios)\n`);

  for (const c of compared) {
    const scenario = SCENARIOS.find((s) => s.id === c.scenarioId);
    console.log(`  ┌─ ${c.scenarioId}: ${scenario?.title ?? ''}`);
    console.log(`  │`);
    console.log(
      `  │  Baseline     │ Atoms: ${String(c.baseline.atomCount).padStart(2)} │ Families: ${c.baseline.families.length} │ Tokens: ${String(c.baseline.tokens).padStart(4)} │ Within table: ${c.baseline.withinTable} │ Valid: ${c.baseline.valid}`,
    );
    console.log(
      `  │  Composition  │ Atoms: ${String(c.composition.atomCount).padStart(2)} │ Families: ${c.composition.families.length} │ Tokens: ${String(c.composition.tokens).padStart(4)} │ Within table: ${c.composition.withinTable} │ Valid: ${c.composition.valid}`,
    );
    console.log(`  │`);
    console.log(
      `  │  Overlap: ${(c.overlap * 100).toFixed(0)}% │ Token savings: ${c.tokenSavings > 0 ? '+' : ''}${c.tokenSavings} (${c.tokenSavingsPercent})`,
    );
    console.log(`  └${'─'.repeat(57)}`);
    console.log();
  }

  const totalBase = compared.reduce((s, c) => s + c.baseline.tokens, 0);
  const totalComp = compared.reduce((s, c) => s + c.composition.tokens, 0);
  const totalSavings = totalBase - totalComp;
  const pct = totalBase > 0 ? ((totalSavings / totalBase) * 100).toFixed(1) : '0.0';

  console.log('═'.repeat(60));
  console.log('  SUMMARY');
  console.log('═'.repeat(60));
  console.log(`  Total baseline tokens:     ${totalBase}`);
  console.log(`  Total composition tokens:  ${totalComp}`);
  console.log(`  Total tokens saved:        ${totalSavings} (${pct}%)`);
  console.log(`  Scenarios with savings:    ${compared.filter((c) => c.tokenSavings > 0).length}/${compared.length}`);
  console.log(
    `  Scenarios within table:    ${compositionScored.results.filter((r) => r.withinTable).length}/${compositionScored.results.length}`,
  );
  console.log(
    `  Avg plan overlap:          ${((compared.reduce((s, c) => s + c.overlap, 0) / compared.length) * 100).toFixed(0)}%`,
  );
  console.log();

  const outPath = path.resolve(__dirname, '../agent-eval-results.json');
  const output = {
    summary: {
      totalBaselineTokens: totalBase,
      totalCompositionTokens: totalComp,
      totalTokensSaved: totalSavings,
      savingsPercent: pct,
      scenariosWithSavings: compared.filter((c) => c.tokenSavings > 0).length,
      totalScenarios: compared.length,
      withinTableCount: compositionScored.results.filter((r) => r.withinTable).length,
    },
    comparisons: compared,
  };
  fs.writeFileSync(outPath, JSON.stringify(output, null, 2));
  console.log(`Full results written to ${outPath}`);
  console.log(`Baseline results:  ${BASELINE_OUT}`);
  console.log(`Composition results: ${COMPOSITION_OUT}`);
}

const mode = process.argv[2];
switch (mode) {
  case 'baseline':
    console.log(generateBaselinePrompt());
    break;
  case 'baseline-prompt':
    console.log(generateBaselinePrompt());
    break;
  case 'composition':
    console.log(generateCompositionPrompt());
    break;
  case 'composition-prompt':
    console.log(generateCompositionPrompt());
    break;
  case 'compare':
    compareResults();
    break;
  default:
    console.log('Usage:');
    console.log('  npx tsx eval/agent-eval.ts baseline    → print baseline subagent prompt');
    console.log('  npx tsx eval/agent-eval.ts composition → print composition subagent prompt');
    console.log('  npx tsx eval/agent-eval.ts compare     → compare saved results');
    break;
}
