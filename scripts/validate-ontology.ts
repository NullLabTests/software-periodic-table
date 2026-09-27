/**
 * Validates the periodic-table.json ontology for consistency and completeness.
 *
 * Checks:
 * - All elements have required fields (id, symbol, name, family, description)
 * - IDs are unique and within family ranges
 * - Symbols are unique and exactly 2 characters
 * - Families are from the known set
 * - No duplicate names within a family (cross-family reuse is intentional)
 * - composesWith references resolve to defined symbols, in either direction
 *
 * Usage: npx tsx scripts/validate-ontology.ts
 */

import * as fs from 'node:fs';
import * as path from 'node:path';

const __dirname = new URL('.', import.meta.url).pathname;
const ONTOLOGY_PATH = path.resolve(__dirname, '../ontology/periodic-table.json');

interface OntologyElement {
  id: number;
  symbol: string;
  name: string;
  family: string;
  description: string;
  composesWith?: string[];
}

interface OntologyFamily {
  id: string;
  name: string;
  description: string;
  range: [number, number];
}

interface Ontology {
  version: string;
  description: string;
  families: OntologyFamily[];
  elements: OntologyElement[];
  compositionNotes: Record<string, string>;
}

const VALID_FAMILIES = new Set(['objects', 'properties', 'actions', 'interfaces', 'intelligence', 'rules']);

const FAMILY_RANGES: Record<string, [number, number]> = {
  objects: [1, 35],
  properties: [36, 60],
  actions: [61, 85],
  interfaces: [86, 100],
  intelligence: [101, 108],
  rules: [109, 115],
};

let errors = 0;
let warnings = 0;
let infos = 0;

function error(msg: string): void {
  console.error(`  ERROR: ${msg}`);
  errors++;
}

function warn(msg: string): void {
  console.warn(`  WARN: ${msg}`);
  warnings++;
}

function info(msg: string): void {
  console.log(`  INFO: ${msg}`);
  infos++;
}

function main(): void {
  console.log('Validating ontology...\n');

  const raw = fs.readFileSync(ONTOLOGY_PATH, 'utf-8');
  const ontology: Ontology = JSON.parse(raw);

  console.log(`Version: ${ontology.version}`);
  console.log(`Families: ${ontology.families.length}`);
  console.log(`Elements: ${ontology.elements.length}\n`);

  // Validate families
  const seenFamilyIds = new Set<string>();
  for (const fam of ontology.families) {
    if (!VALID_FAMILIES.has(fam.id)) {
      error(`Unknown family id: ${fam.id}`);
    }
    if (seenFamilyIds.has(fam.id)) {
      error(`Duplicate family id: ${fam.id}`);
    }
    seenFamilyIds.add(fam.id);

    const expectedRange = FAMILY_RANGES[fam.id];
    if (expectedRange) {
      if (fam.range[0] !== expectedRange[0] || fam.range[1] !== expectedRange[1]) {
        error(`Family ${fam.id} range [${fam.range.join(', ')}] does not match expected [${expectedRange.join(', ')}]`);
      }
    }
  }

  // Collect every declared symbol up front so that composesWith references can
  // resolve in either direction. Doing this incrementally would flag every
  // forward reference (an element composed with a later-defined element) as
  // unresolved, since the target symbol would not have been seen yet.
  const declaredSymbols = new Set<string>(ontology.elements.map((e) => e.symbol));

  // Validate elements
  const seenIds = new Set<number>();
  const seenSymbols = new Set<string>();
  const seenNames = new Map<string, OntologyElement>();

  for (const elem of ontology.elements) {
    // Required fields
    if (typeof elem.id !== 'number') error(`Element missing id: ${JSON.stringify(elem)}`);
    if (!elem.symbol) error(`Element ${elem.id} missing symbol`);
    if (!elem.name) error(`Element ${elem.id} missing name`);
    if (!elem.family) error(`Element ${elem.id} missing family`);
    if (!elem.description) error(`Element ${elem.id} missing description`);

    // ID uniqueness
    if (seenIds.has(elem.id)) error(`Duplicate element id: ${elem.id}`);
    seenIds.add(elem.id);

    // Symbol validation
    if (elem.symbol.length !== 2) error(`Element ${elem.id} symbol "${elem.symbol}" is not exactly 2 characters`);
    if (seenSymbols.has(elem.symbol)) error(`Duplicate symbol: ${elem.symbol}`);
    seenSymbols.add(elem.symbol);

    // Name uniqueness. The same word legitimately names elements in different
    // families (e.g. an Email object and an Email property), so only a repeat
    // inside one family indicates a real collision.
    const priorName = seenNames.get(elem.name);
    if (priorName) {
      const detail = `"${priorName.family}" (${priorName.symbol}, id ${priorName.id})`;
      if (priorName.family === elem.family) {
        warn(
          `Duplicate name in family ${elem.family}: "${elem.name}" — ${elem.symbol} (id ${elem.id}) collides with ${detail}`,
        );
      } else {
        info(
          `Name "${elem.name}" reused across families: ${detail} and "${elem.family}" (${elem.symbol}, id ${elem.id})`,
        );
      }
    }
    seenNames.set(elem.name, elem);

    // Family validation
    if (!VALID_FAMILIES.has(elem.family)) {
      error(`Element ${elem.id} has unknown family: ${elem.family}`);
    }

    // ID range check
    const range = FAMILY_RANGES[elem.family];
    if (range) {
      if (elem.id < range[0] || elem.id > range[1]) {
        error(`Element ${elem.id} (${elem.symbol}) outside range for family ${elem.family} [${range}]`);
      }
    }

    // composesWith references must resolve to a declared symbol. Reference
    // order is irrelevant, so both backward and forward references are valid.
    if (elem.composesWith) {
      if (!Array.isArray(elem.composesWith)) {
        error(`Element ${elem.id} composesWith is not an array`);
      } else {
        const localSeen = new Set<string>();
        for (const ref of elem.composesWith) {
          if (typeof ref !== 'string' || ref.length !== 2) {
            error(`Element ${elem.id} composesWith entry "${ref}" is not a 2-char symbol`);
            continue;
          }
          if (localSeen.has(ref)) {
            warn(`Element ${elem.id} (${elem.symbol}) lists "${ref}" in composesWith more than once`);
          }
          localSeen.add(ref);
          if (ref === elem.symbol) {
            warn(`Element ${elem.id} (${elem.symbol}) composesWith itself`);
          }
          if (!declaredSymbols.has(ref)) {
            error(`Element ${elem.id} (${elem.symbol}) composesWith unknown symbol "${ref}"`);
          }
        }
      }
    }
  }

  // Check for missing IDs in each family range
  for (const [family, [start, end]] of Object.entries(FAMILY_RANGES)) {
    const familyElements = ontology.elements.filter((e) => e.family === family);
    const familyIds = new Set(familyElements.map((e) => e.id));
    for (let id = start; id <= end; id++) {
      if (!familyIds.has(id)) {
        warn(`Missing element id ${id} in family ${family}`);
      }
    }
  }

  // Summary
  const parts = [`${errors} errors, ${warnings} warnings`];
  if (infos > 0) parts.push(`${infos} informational notes`);
  console.log(`\nValidation complete. ${parts.join(', ')}.`);
  if (errors > 0) {
    process.exit(1);
  }
}

main();
