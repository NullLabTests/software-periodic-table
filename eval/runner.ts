import * as fs from 'node:fs';
import * as path from 'node:path';
import { COMPOSITION_SYSTEM_PROMPT, formatTableSummary } from '../composer/prompt.js';
import {
  type AggregateResult,
  aggregateRepeats,
  type CompositionPlan,
  checkWithinTable,
  type EvalResult,
  estimateTokens,
  summarizeAggregates,
  summarizeResults,
} from './metrics.js';
import { type EvalScenario, SCENARIOS } from './scenarios.js';

const __dirname = new URL('.', import.meta.url).pathname;
const ONTOLOGY_PATH = path.resolve(__dirname, '../ontology/periodic-table.json');

interface OntologyElement {
  id: number;
  symbol: string;
  name: string;
  family: string;
  description: string;
}

interface Ontology {
  version: string;
  elements: OntologyElement[];
}

function loadOntology(): Ontology {
  const raw = fs.readFileSync(ONTOLOGY_PATH, 'utf-8');
  return JSON.parse(raw) as Ontology;
}

function buildKnownSymbols(ontology: Ontology): Set<string> {
  return new Set(ontology.elements.map((e) => e.symbol));
}

function getFamilySymbolToFamily(ontology: Ontology): Map<string, string> {
  const map = new Map<string, string>();
  for (const e of ontology.elements) {
    map.set(e.symbol, e.family);
  }
  return map;
}

function mockPlanForScenario(scenario: EvalScenario): CompositionPlan {
  const objects = scenario.expectedAtoms.filter((a) => a.family === 'objects').flatMap((a) => a.symbols);
  const properties = scenario.expectedAtoms.filter((a) => a.family === 'properties').flatMap((a) => a.symbols);
  const actions = scenario.expectedAtoms.filter((a) => a.family === 'actions').flatMap((a) => a.symbols);
  const interfaces = scenario.expectedAtoms.filter((a) => a.family === 'interfaces').flatMap((a) => a.symbols);
  const intelligence = scenario.expectedAtoms.filter((a) => a.family === 'intelligence').flatMap((a) => a.symbols);
  const rules = scenario.expectedAtoms.filter((a) => a.family === 'rules').flatMap((a) => a.symbols);

  return { objects, properties, actions, interfaces, intelligence, rules };
}

function serializePlan(plan: CompositionPlan): string {
  return JSON.stringify(plan, null, 2);
}

function generateImplementation(plan: CompositionPlan): string {
  const allAtoms = [
    ...plan.objects,
    ...plan.properties,
    ...plan.actions,
    ...plan.interfaces,
    ...plan.intelligence,
    ...plan.rules,
  ];
  const imports = allAtoms.map((a) => `import { ${a} } from "../atoms/...";`).join('\n');
  const configCalls = plan.interfaces.map((i) => `  // define${i}(...)`).join('\n');
  const actionCalls = plan.actions.map((a) => `  // ${a}Action(...)`).join('\n');
  return `${imports}\n\n// Composition implementation\n${configCalls}\n${actionCalls}\n`;
}

async function buildLLMCompositionPlan(
  scenario: EvalScenario,
  ontologyElements: OntologyElement[],
): Promise<{ plan: CompositionPlan; baseline: string }> {
  const { OpenAIProvider } = await import('./llm.js');
  const apiKey = process.env.LLM_API_KEY!;
  const provider = new OpenAIProvider({
    apiKey,
    model: process.env.LLM_MODEL,
    baseUrl: process.env.LLM_BASE_URL,
    api: process.env.LLM_API as 'responses' | 'chat' | undefined,
  });

  const ontologyContext = formatTableSummary(ontologyElements);
  const plan = await provider.generateCompositionPlan(
    scenario.featureRequest,
    ontologyContext,
    COMPOSITION_SYSTEM_PROMPT,
  );
  const baseline = await provider.generateBaseline(scenario.featureRequest);
  return { plan, baseline };
}

const CRITERION_ATOM_MAP: Record<string, string[]> = {
  create: ['Cr'],
  update: ['Up'],
  delete: ['De'],
  view: ['Vw'],
  search: ['Se', 'Sr'],
  filter: ['Fi'],
  sort: ['So'],
  export: ['Ex'],
  notify: ['No'],
  notif: ['No'],
  message: ['Mg'],
  trigger: ['Tr'],
  kanban: ['Kb'],
  table: ['Tb'],
  form: ['Fm'],
  chart: ['Ch'],
  calendar: ['Ce'],
  gallery: ['Gy'],
  detail: ['Di'],
  feed: ['Fd'],
  card: ['Cd'],
  list: ['Ls'],
  grid: ['Gd'],
  timeline: ['Tl'],
  permission: ['Pn'],
  policy: ['Po'],
  audit: ['Au'],
  assign: ['As'],
  recommend: ['Rc'],
  summarize: ['Sm'],
  classify: ['Cs'],
  generate: ['Gn'],
  analyze: ['An'],
  activity: ['Ay'],
  log: ['Ay'],
  team: ['Tm'],
  role: ['Ro', 'Pn'],
  import: ['Im'],
  duplicate: ['Dp'],
  archive: ['Ar'],
  restore: ['Rs'],
  approve: ['Ap'],
  reject: ['Rj'],
  schedule: ['Sc', 'Sa'],
  condition: ['Cv'],
  status: ['Ss'],
  priority: ['Py'],
  currency: ['Cu'],
  owner: ['Ow'],
  company: ['Co'],
  contact: ['Ct'],
  product: ['Pr'],
  invoice: ['In'],
  user: ['Us'],
  task: ['Tk'],
  project: ['Pj'],
};

function evaluateAcceptance(criterion: string, plan: CompositionPlan): boolean {
  const text = criterion.toLowerCase();
  const allSymbols = new Set([
    ...plan.objects,
    ...plan.properties,
    ...plan.actions,
    ...plan.interfaces,
    ...plan.intelligence,
    ...plan.rules,
  ]);

  for (const [keyword, symbols] of Object.entries(CRITERION_ATOM_MAP)) {
    if (text.includes(keyword)) {
      if (symbols.some((s) => allSymbols.has(s))) return true;
    }
  }

  return allSymbols.size > 0;
}

function evaluateScenario(scenario: EvalScenario, knownSymbols: Set<string>, plan: CompositionPlan): EvalResult {
  const { withinTable } = checkWithinTable(plan, knownSymbols);

  const planStr = serializePlan(plan);
  const implStr = generateImplementation(plan);
  const planTokens = estimateTokens(planStr);
  const implTokens = estimateTokens(implStr);

  const acceptanceChecks = scenario.acceptanceCriteria.map((criterion) => ({
    criterion,
    passed: evaluateAcceptance(criterion, plan),
  }));

  const familiesCovered: string[] = [];
  if (plan.objects.length > 0) familiesCovered.push('objects');
  if (plan.properties.length > 0) familiesCovered.push('properties');
  if (plan.actions.length > 0) familiesCovered.push('actions');
  if (plan.interfaces.length > 0) familiesCovered.push('interfaces');
  if (plan.intelligence.length > 0) familiesCovered.push('intelligence');
  if (plan.rules.length > 0) familiesCovered.push('rules');

  const atomCount = [
    ...plan.objects,
    ...plan.properties,
    ...plan.actions,
    ...plan.interfaces,
    ...plan.intelligence,
    ...plan.rules,
  ].length;

  const allChecksPass = acceptanceChecks.every((c) => c.passed);
  const valid = withinTable && allChecksPass && atomCount >= scenario.minAtomsUsed;

  return {
    scenarioId: scenario.id,
    plan,
    atomsUsed: [],
    atomCount,
    familiesCovered: familiesCovered as EvalResult['familiesCovered'],
    withinTable,
    tokenEstimate: {
      planTokens,
      implementationTokens: implTokens,
      totalTokens: planTokens + implTokens,
    },
    acceptanceChecks,
    valid,
  };
}

async function main(): Promise<void> {
  const ontology = loadOntology();
  const knownSymbols = buildKnownSymbols(ontology);
  const _familyMap = getFamilySymbolToFamily(ontology);
  const results: EvalResult[] = [];
  const useLLM = !!process.env.LLM_API_KEY;

  console.log('Software Periodic Table — Evaluation Harness\n');
  console.log(`Ontology loaded: ${ontology.elements.length} elements, ${SCENARIOS.length} scenarios`);
  console.log(`Mode: ${useLLM ? 'LLM (real provider)' : 'Mock (expected atoms)'}\n`);

  if (useLLM) {
    // Repeats exist so the summary can report spread. One sample per scenario
    // cannot tell "reliably valid" apart from "valid on the draw we happened
    // to make", and a single flaky pass reads exactly like a solid result.
    const repeats = Math.max(1, Number.parseInt(process.env.EVAL_REPEATS ?? '3', 10) || 1);
    const aggregates: AggregateResult[] = [];

    console.log(`Running LLM-based evaluation, ${repeats} repeat(s) per scenario...\n`);
    for (const scenario of SCENARIOS) {
      console.log(`Scenario: ${scenario.id} (${scenario.title})`);
      const samples: EvalResult[] = [];

      for (let i = 1; i <= repeats; i++) {
        try {
          const { plan, baseline } = await buildLLMCompositionPlan(scenario, ontology.elements);
          const result = evaluateScenario(scenario, knownSymbols, plan);
          samples.push(result);
          results.push(result);

          const baseTokens = estimateTokens(baseline);
          const savings =
            baseTokens > 0 ? ((1 - result.tokenEstimate.totalTokens / baseTokens) * 100).toFixed(0) : 'N/A';
          const statusIcon = result.valid ? 'PASS' : 'FAIL';
          console.log(
            `  [${i}/${repeats}] Composition -> ${statusIcon} | ${result.atomCount} atoms | ${result.familiesCovered.length} families | ${result.tokenEstimate.totalTokens} tokens`,
          );
          console.log(`           Baseline -> ${baseTokens} tokens (est.), savings ${savings}%`);
        } catch (err) {
          console.error(`  [${i}/${repeats}] ERROR: ${err instanceof Error ? err.message : String(err)}`);
        }
      }

      if (samples.length > 0) {
        const agg = aggregateRepeats(scenario.id, samples);
        aggregates.push(agg);
        console.log(
          `  => ${agg.validCount}/${agg.repeats} valid | atoms ${agg.atomCount.mean.toFixed(1)} +/- ${agg.atomCount.sd.toFixed(2)} | ${agg.stable ? 'stable' : 'UNSTABLE'}\n`,
        );
      } else {
        console.log(`  => no successful samples\n`);
      }
    }

    if (aggregates.length > 0) {
      console.log(summarizeAggregates(aggregates));
      const aggPath = path.resolve(__dirname, '../eval-results.aggregate.json');
      fs.writeFileSync(aggPath, JSON.stringify(aggregates, null, 2));
      console.log(`Aggregate results written to ${aggPath}\n`);
    }
  } else {
    for (const scenario of SCENARIOS) {
      console.log(`Running scenario: ${scenario.id} (${scenario.title})`);
      const plan = mockPlanForScenario(scenario);
      const result = evaluateScenario(scenario, knownSymbols, plan);
      results.push(result);

      const statusIcon = result.valid ? 'PASS' : 'FAIL';
      console.log(
        `  -> ${statusIcon} | ${result.atomCount} atoms | ${result.familiesCovered.length} families | ${result.tokenEstimate.totalTokens} tokens est.\n`,
      );
    }
  }

  console.log(summarizeResults(results));

  const outPath = path.resolve(__dirname, '../eval-results.json');
  fs.writeFileSync(outPath, JSON.stringify(results, null, 2));
  console.log(`Full results written to ${outPath}`);
}

main();
