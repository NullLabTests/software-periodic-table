/**
 * Shared loader for the canonical ontology.
 *
 * `ontology/periodic-table.json` is the single source of truth for family
 * ranges, symbols and names. Everything that needs to read it — the validator,
 * the coverage report, the evaluation harness and the test suite — goes through
 * this module so that a change to the ontology needs no matching change in code.
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));

/**
 * Locate a file at the repository or package root.
 *
 * This module is compiled twice over: once as `src/ontology.ts` during
 * development, and once as `dist/src/ontology.js` by `npm run build`. A fixed
 * `../ontology/...` resolves correctly in the first case and not the second,
 * because `tsc` does not copy non-TypeScript assets. Walking up from the module
 * until the file appears handles the source layout, the compiled layout, and a
 * published package where only `dist/` and `ontology/` are shipped.
 */
function locateFromRoot(relativePath: string): string {
  let dir = HERE;
  for (let i = 0; i < 6; i += 1) {
    const candidate = path.resolve(dir, relativePath);
    if (fs.existsSync(candidate)) return candidate;
    const parent = path.dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  throw new Error(
    `Could not locate ${relativePath} by walking up from ${HERE}. ` +
      'Run from a checkout, or install the published package.',
  );
}

export const REPO_ROOT = path.resolve(locateFromRoot('ontology/periodic-table.json'), '..', '..');
export const ONTOLOGY_PATH = locateFromRoot('ontology/periodic-table.json');
export const ONTOLOGY_SCHEMA_PATH = locateFromRoot('ontology/periodic-table.schema.json');

/** True if the directory holds hand-written TypeScript rather than build output. */
function hasTypeScriptSources(dir: string): boolean {
  try {
    return fs
      .readdirSync(dir, { withFileTypes: true })
      .some((entry) => entry.isFile() && entry.name.endsWith('.ts') && !entry.name.endsWith('.d.ts'));
  } catch {
    return false;
  }
}

/**
 * Directory holding the reference implementations.
 *
 * Coverage must measure hand-written TypeScript, not compiled output: `tsc`
 * mirrors `atoms/` to `dist/atoms/` as `.js` plus `.d.ts`, and a directory of
 * declarations would score every atom as unimplemented. So a candidate only
 * counts if it contains real sources.
 */
export const ATOMS_DIR =
  [path.resolve(REPO_ROOT, 'atoms'), path.resolve(HERE, '..', 'atoms')].find(hasTypeScriptSources) ??
  path.resolve(REPO_ROOT, 'atoms');

export const FAMILY_IDS = ['objects', 'properties', 'actions', 'interfaces', 'intelligence', 'rules'] as const;

export type FamilyId = (typeof FAMILY_IDS)[number];
export type IdRange = [number, number];

export interface OntologyElement {
  id: number;
  symbol: string;
  name: string;
  family: string;
  description: string;
  composesWith?: string[];
}

export interface OntologyFamily {
  id: string;
  name: string;
  description: string;
  range: IdRange;
}

export interface Ontology {
  version: string;
  description: string;
  families: OntologyFamily[];
  elements: OntologyElement[];
  compositionNotes: Record<string, string>;
}

export function loadOntology(file: string = ONTOLOGY_PATH): Ontology {
  return JSON.parse(fs.readFileSync(file, 'utf-8')) as Ontology;
}

export function loadOntologySchema(file: string = ONTOLOGY_SCHEMA_PATH): Record<string, unknown> {
  return JSON.parse(fs.readFileSync(file, 'utf-8')) as Record<string, unknown>;
}

/**
 * Family id ranges, read from the ontology rather than restated in code.
 * Previously these were duplicated as a hardcoded constant in the validator,
 * where they could drift away from `families[].range` without any check.
 */
export function familyRanges(ontology: Ontology): Map<string, IdRange> {
  const ranges = new Map<string, IdRange>();
  for (const family of ontology.families) {
    ranges.set(family.id, [family.range[0], family.range[1]]);
  }
  return ranges;
}

export function isFamilyId(value: string): value is FamilyId {
  return (FAMILY_IDS as readonly string[]).includes(value);
}

/** Every declared symbol. */
export function symbolSet(ontology: Ontology): Set<string> {
  return new Set(ontology.elements.map((e) => e.symbol));
}

/** symbol -> element, for name normalization. */
export function symbolIndex(ontology: Ontology): Map<string, OntologyElement> {
  return new Map(ontology.elements.map((e) => [e.symbol, e]));
}
/** symbol -> name, for rendering a symbol as human-readable text. */
export function symbolToName(ontology: Ontology): Map<string, string> {
  return new Map(ontology.elements.map((e) => [e.symbol, e.name]));
}

export interface NameIndex {
  /** Any family. Last writer wins, matching the ontology's declaration order. */
  any: Map<string, string>;
  /** Family-qualified, so callers that care about the family are never ambiguous. */
  byFamily: Map<string, Map<string, string>>;
}

export function buildNameIndex(ontology: Ontology): NameIndex {
  const any = new Map<string, string>();
  const byFamily = new Map<string, Map<string, string>>();
  for (const element of ontology.elements) {
    const key = element.name.toLowerCase();
    any.set(key, element.symbol);
    // Symbols map to themselves so that normalizing a plan which already uses
    // symbols is a no-op rather than a rewrite.
    any.set(element.symbol, element.symbol);
    let familyMap = byFamily.get(element.family);
    if (!familyMap) {
      familyMap = new Map<string, string>();
      byFamily.set(element.family, familyMap);
    }
    familyMap.set(key, element.symbol);
    familyMap.set(element.symbol, element.symbol);
  }
  return { any, byFamily };
}

/**
 * Names that appear in more than one family, e.g. Email exists as an object
 * (Em) and as a property (Ea). Callers resolving a bare name must either pick a
 * family or accept that the answer is order-dependent.
 */
export function ambiguousNames(ontology: Ontology): Map<string, string[]> {
  const seen = new Map<string, string[]>();
  for (const element of ontology.elements) {
    const key = element.name.toLowerCase();
    const families = seen.get(key) ?? [];
    families.push(element.family);
    seen.set(key, families);
  }
  const ambiguous = new Map<string, string[]>();
  for (const [name, families] of seen) {
    if (families.length > 1) ambiguous.set(name, families);
  }
  return ambiguous;
}
