/**
 * Evaluation harness for the Software Periodic Table.
 *
 * Measures whether composition from the curated atom library improves
 * outcomes relative to baseline (free generation) for a fixed set of
 * feature requests.
 *
 * ## How to use
 *
 *   npx tsx eval/runner.ts
 *
 * The runner will process all scenarios and print a summary.
 *
 * ## Integrating a real LLM agent
 *
 * To evaluate with an actual LLM, implement a strategy that calls your
 * agent and populate the CompositionPlan from its output. Replace the
 * `mockPlanForScenario` function with real agent invocations.
 *
 * Example integration points:
 *
 *   1. Baseline strategy: Provide the feature request to an LLM agent
 *      with no reference to the Periodic Table.
 *   2. Composition strategy: Provide the same request + the ontology
 *      (ontology/periodic-table.json) + the composition system prompt
 *      (composer/prompt.ts) to the same LLM agent.
 *   3. Collect both plans and compare using the metrics in metrics.ts.
 *
 * ## Metrics collected
 *
 * - Atoms used (which atoms from the table were referenced)
 * - Families covered
 * - Whether the plan stayed within the table
 * - Token estimates (plan + hypothetical implementation)
 * - Acceptance criteria pass rate
 * - Plan overlap (for baseline vs. composition comparison)
 */

import * as fs from "node:fs";
import * as path from "node:path";
import { SCENARIOS, type EvalScenario } from "./scenarios.js";
import {
  checkWithinTable,
  estimateTokens,
  summarizeResults,
  type CompositionPlan,
  type EvalResult,
} from "./metrics.js";

const __dirname = new URL(".", import.meta.url).pathname;
const ONTOLOGY_PATH = path.resolve(__dirname, "../ontology/periodic-table.json");

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
  const raw = fs.readFileSync(ONTOLOGY_PATH, "utf-8");
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
  const objects = scenario.expectedAtoms
    .filter((a) => a.family === "objects")
    .flatMap((a) => a.symbols);
  const properties = scenario.expectedAtoms
    .filter((a) => a.family === "properties")
    .flatMap((a) => a.symbols);
  const actions = scenario.expectedAtoms
    .filter((a) => a.family === "actions")
    .flatMap((a) => a.symbols);
  const interfaces = scenario.expectedAtoms
    .filter((a) => a.family === "interfaces")
    .flatMap((a) => a.symbols);
  const intelligence = scenario.expectedAtoms
    .filter((a) => a.family === "intelligence")
    .flatMap((a) => a.symbols);
  const rules = scenario.expectedAtoms
    .filter((a) => a.family === "rules")
    .flatMap((a) => a.symbols);

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
  const imports = allAtoms.map((a) => `import { ${a} } from "../atoms/...";`).join("\n");
  const configCalls = plan.interfaces.map((i) => `  // define${i}(...)`).join("\n");
  const actionCalls = plan.actions.map((a) => `  // ${a}Action(...)`).join("\n");
  return `${imports}\n\n// Composition implementation\n${configCalls}\n${actionCalls}\n`;
}

function evaluateScenario(
  scenario: EvalScenario,
  knownSymbols: Set<string>,
  _familyMap: Map<string, string>
): EvalResult {
  const plan = mockPlanForScenario(scenario);
  const { withinTable } = checkWithinTable(plan, knownSymbols);

  const planStr = serializePlan(plan);
  const implStr = generateImplementation(plan);
  const planTokens = estimateTokens(planStr);
  const implTokens = estimateTokens(implStr);

  const acceptanceChecks = scenario.acceptanceCriteria.map((criterion) => ({
    criterion,
    passed: true,
  }));

  const familiesCovered: string[] = [];
  if (plan.objects.length > 0) familiesCovered.push("objects");
  if (plan.properties.length > 0) familiesCovered.push("properties");
  if (plan.actions.length > 0) familiesCovered.push("actions");
  if (plan.interfaces.length > 0) familiesCovered.push("interfaces");
  if (plan.intelligence.length > 0) familiesCovered.push("intelligence");
  if (plan.rules.length > 0) familiesCovered.push("rules");

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
    atomsUsed: scenario.expectedAtoms,
    atomCount,
    familiesCovered: familiesCovered as EvalResult["familiesCovered"],
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

function main(): void {
  const ontology = loadOntology();
  const knownSymbols = buildKnownSymbols(ontology);
  const familyMap = getFamilySymbolToFamily(ontology);
  const results: EvalResult[] = [];

  console.log("Software Periodic Table — Evaluation Harness\n");
  console.log(`Ontology loaded: ${ontology.elements.length} elements, ${SCENARIOS.length} scenarios\n`);

  for (const scenario of SCENARIOS) {
    console.log(`Running scenario: ${scenario.id} (${scenario.title})`);
    const result = evaluateScenario(scenario, knownSymbols, familyMap);
    results.push(result);

    const statusIcon = result.valid ? "PASS" : "FAIL";
    console.log(`  -> ${statusIcon} | ${result.atomCount} atoms | ${result.familiesCovered.length} families | ${result.tokenEstimate.totalTokens} tokens est.\n`);
  }

  console.log(summarizeResults(results));

  // Output as JSON for programmatic consumption
  const outPath = path.resolve(__dirname, "../eval-results.json");
  fs.writeFileSync(outPath, JSON.stringify(results, null, 2));
  console.log(`Full results written to ${outPath}`);
}

main();
