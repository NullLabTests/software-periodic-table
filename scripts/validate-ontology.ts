/**
 * Validates periodic-table.json for schema conformance and internal consistency.
 *
 * Two layers:
 *
 * 1. Schema — the file is checked against `ontology/periodic-table.schema.json`,
 *    which was previously shipped but never actually applied to anything.
 * 2. Consistency — the rules a JSON Schema cannot express: unique ids, unique
 *    symbols, ids inside their family's range, resolvable `composesWith`
 *    references, and a fully allocated id space per family.
 *
 * Family ranges are read from the ontology rather than restated here, so the two
 * cannot drift apart.
 *
 * Usage: npx tsx scripts/validate-ontology.ts
 */

import { type SchemaError, unsupportedKeywords, validateSchema } from '../src/jsonschema.js';
import {
  ambiguousNames,
  familyRanges,
  isFamilyId,
  loadOntology,
  loadOntologySchema,
  type Ontology,
  type OntologyElement,
} from '../src/ontology.js';

export interface Finding {
  severity: 'ERROR' | 'WARN' | 'INFO';
  message: string;
}

export interface ValidationReport {
  version: string;
  elementCount: number;
  findings: Finding[];
  errorCount: number;
  warningCount: number;
  infoCount: number;
  ok: boolean;
}

export function validateOntology(ontology: Ontology, schema?: Record<string, unknown>): ValidationReport {
  const findings: Finding[] = [];
  const error = (message: string) => findings.push({ severity: 'ERROR', message });
  const warn = (message: string) => findings.push({ severity: 'WARN', message });
  const info = (message: string) => findings.push({ severity: 'INFO', message });

  // ---- Layer 1: JSON Schema -------------------------------------------------

  if (schema) {
    const unsupported = unsupportedKeywords(schema);
    for (const location of unsupported) {
      warn(`schema keyword not supported by the in-repo validator: ${location}`);
    }
    const schemaErrors: SchemaError[] = validateSchema(ontology, schema);
    for (const e of schemaErrors) {
      error(`schema: ${e.path}: ${e.message}`);
    }
  }

  // ---- Layer 2: consistency -------------------------------------------------

  const ranges = familyRanges(ontology);

  const seenFamilyIds = new Set<string>();
  for (const family of ontology.families) {
    if (!isFamilyId(family.id)) error(`unknown family id: ${family.id}`);
    if (seenFamilyIds.has(family.id)) error(`duplicate family id: ${family.id}`);
    seenFamilyIds.add(family.id);
  }

  const declaredSymbols = new Set(ontology.elements.map((e) => e.symbol));
  const seenIds = new Set<number>();
  const seenSymbols = new Set<string>();
  const seenNames = new Map<string, OntologyElement>();
  const rangeOwners = new Map<string, OntologyElement>();

  for (const elem of ontology.elements) {
    if (typeof elem.id !== 'number') error(`element missing id: ${JSON.stringify(elem)}`);
    if (!elem.symbol) error(`element ${elem.id} missing symbol`);
    if (!elem.name) error(`element ${elem.id} missing name`);
    if (!elem.family) error(`element ${elem.id} missing family`);
    if (!elem.description) error(`element ${elem.id} missing description`);

    if (seenIds.has(elem.id)) error(`duplicate element id: ${elem.id}`);
    seenIds.add(elem.id);

    if (elem.symbol.length !== 2) error(`element ${elem.id} symbol "${elem.symbol}" is not exactly 2 characters`);
    if (seenSymbols.has(elem.symbol)) error(`duplicate symbol: ${elem.symbol}`);
    seenSymbols.add(elem.symbol);

    // A name may legitimately recur across families (an Email object and an
    // Email property), so only a repeat inside one family is a real collision.
    const priorName = seenNames.get(elem.name);
    if (priorName) {
      const detail = `"${priorName.family}" (${priorName.symbol}, id ${priorName.id})`;
      if (priorName.family === elem.family) {
        warn(
          `duplicate name in family ${elem.family}: "${elem.name}" — ${elem.symbol} (id ${elem.id}) collides with ${detail}`,
        );
      } else {
        info(
          `name "${elem.name}" reused across families: ${detail} and "${elem.family}" (${elem.symbol}, id ${elem.id})`,
        );
      }
    }
    seenNames.set(elem.name, elem);

    if (!isFamilyId(elem.family)) {
      error(`element ${elem.id} has unknown family: ${elem.family}`);
    }

    const range = ranges.get(elem.family);
    if (range && (elem.id < range[0] || elem.id > range[1])) {
      error(`element ${elem.id} (${elem.symbol}) outside range for family ${elem.family} [${range}]`);
    }

    // Two elements may not claim the same id even across families, since the id
    // is the element's identity in the table.
    const rangeOwner = rangeOwners.get(String(elem.id));
    if (rangeOwner) {
      error(
        `element id ${elem.id} is claimed by both ${rangeOwner.symbol} (${rangeOwner.family}) and ${elem.symbol} (${elem.family})`,
      );
    } else {
      rangeOwners.set(String(elem.id), elem);
    }

    // composesWith must resolve to a declared symbol. Declaration order is
    // irrelevant, so forward and backward references are both valid.
    if (elem.composesWith !== undefined) {
      if (!Array.isArray(elem.composesWith)) {
        error(`element ${elem.id} composesWith is not an array`);
      } else {
        const localSeen = new Set<string>();
        for (const ref of elem.composesWith) {
          if (typeof ref !== 'string' || ref.length !== 2) {
            error(`element ${elem.id} composesWith entry "${ref}" is not a 2-char symbol`);
            continue;
          }
          if (localSeen.has(ref)) {
            warn(`element ${elem.id} (${elem.symbol}) lists "${ref}" in composesWith more than once`);
          }
          localSeen.add(ref);
          if (ref === elem.symbol) warn(`element ${elem.id} (${elem.symbol}) composesWith itself`);
          if (!declaredSymbols.has(ref)) {
            error(`element ${elem.id} (${elem.symbol}) composesWith unknown symbol "${ref}"`);
          }
        }
      }
    } else {
      warn(`element ${elem.id} (${elem.symbol}) declares no composesWith`);
    }
  }

  // Every id inside every family range must be allocated.
  for (const [family, [start, end]] of ranges) {
    const familyIds = new Set(ontology.elements.filter((e) => e.family === family).map((e) => e.id));
    for (let id = start; id <= end; id++) {
      if (!familyIds.has(id)) warn(`unallocated id ${id} in family ${family} range [${start}, ${end}]`);
    }
  }

  // Names shared across families are intentional, but any tooling that resolves a
  // bare name must know, so the ambiguity is reported rather than left implicit.
  for (const [name, families] of ambiguousNames(ontology)) {
    info(`name "${name}" is ambiguous across families: ${families.join(', ')}`);
  }

  const errorCount = findings.filter((f) => f.severity === 'ERROR').length;
  const warningCount = findings.filter((f) => f.severity === 'WARN').length;
  const infoCount = findings.filter((f) => f.severity === 'INFO').length;

  return {
    version: ontology.version,
    elementCount: ontology.elements.length,
    findings,
    errorCount,
    warningCount,
    infoCount,
    ok: errorCount === 0,
  };
}

function main(): void {
  const ontology = loadOntology();
  const schema = loadOntologySchema();
  const report = validateOntology(ontology, schema);

  console.log('Validating ontology...\n');
  console.log(`Version: ${report.version}`);
  console.log(`Families: ${ontology.families.length}`);
  console.log(`Elements: ${report.elementCount}\n`);

  // INFO first, then WARN, then ERROR: the reader wants the reassuring noise
  // out of the way before the parts that need attention.
  for (const severity of ['INFO', 'WARN', 'ERROR'] as const) {
    for (const finding of report.findings.filter((f) => f.severity === severity)) {
      const line = `  ${severity}: ${finding.message}`;
      if (severity === 'ERROR') console.error(line);
      else if (severity === 'WARN') console.warn(line);
      else console.log(line);
    }
  }

  const parts = [`${report.errorCount} errors, ${report.warningCount} warnings`];
  if (report.infoCount > 0) parts.push(`${report.infoCount} informational notes`);
  console.log(`\nValidation complete. ${parts.join(', ')}.`);

  if (!report.ok) process.exit(1);
}

const invokedDirectly =
  process.argv[1] !== undefined && import.meta.url.endsWith(process.argv[1].split('/').pop() ?? '');
if (invokedDirectly) main();
