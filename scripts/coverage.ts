/**
 * Reports reference-implementation coverage of the ontology.
 *
 * Scans atoms/** for exported AtomMeta declarations (symbol + name) and compares
 * them against ontology/periodic-table.json. Beyond counting coverage this also
 * cross-checks the two directions that a pure count hides:
 *
 * - an implemented symbol whose recorded name disagrees with the ontology
 * - an implemented symbol that is not in the ontology at all (a typo that would
 *   otherwise be counted as coverage of nothing)
 *
 * Usage: npx tsx scripts/coverage.ts
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
import { ATOMS_DIR, loadOntology, type Ontology } from '../src/ontology.js';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const DEFAULT_ATOMS_DIR = path.resolve(HERE, '../atoms');

const META_PATTERN =
  /(?:export\s+)?(?:const|function)\s+(\w+Meta)\s*[:=][\s\S]*?symbol:\s*'([A-Za-z]{2})'[\s\S]*?name:\s*'([^']+)'/g;

export interface FamilyCoverage {
  family: string;
  covered: number;
  total: number;
  percent: number;
  missing: { id: number; symbol: string; name: string }[];
}

export interface CoverageReport {
  version: string;
  families: FamilyCoverage[];
  covered: number;
  total: number;
  percent: number;
  /** Implemented symbols with a name that disagrees with the ontology. */
  mismatchedNames: { symbol: string; implementedName: string; ontologyName: string; file: string }[];
  /** Implemented symbols that do not exist in the ontology. */
  orphans: { symbol: string; name: string; file: string }[];
  atomFileCount: number;
  ontologyValid: boolean;
}

export function walk(dir: string, files: string[] = []): string[] {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, files);
    else if (entry.name.endsWith('.ts') && entry.name !== 'core.ts') files.push(full);
  }
  return files;
}

export function findAtoms(dir: string): Map<string, { name: string; file: string }> {
  const implemented = new Map<string, { name: string; file: string }>();
  for (const file of walk(dir)) {
    const source = fs.readFileSync(file, 'utf8');
    for (const match of source.matchAll(META_PATTERN)) {
      const symbol = match[2];
      const name = match[3];
      if (symbol && name) {
        implemented.set(symbol, { name, file: path.relative(dir, file) });
      }
    }
  }
  return implemented;
}

export function buildCoverageReport(ontology: Ontology, atomsDir: string = DEFAULT_ATOMS_DIR): CoverageReport {
  const implemented = findAtoms(atomsDir);
  const ontologyBySymbol = new Map(ontology.elements.map((e) => [e.symbol, e]));

  const byFamily = new Map<string, FamilyCoverage>();
  for (const family of ontology.families) {
    byFamily.set(family.id, { family: family.id, covered: 0, total: 0, percent: 0, missing: [] });
  }

  const mismatchedNames: CoverageReport['mismatchedNames'] = [];
  const orphans: CoverageReport['orphans'] = [];

  for (const element of ontology.elements) {
    const stats = byFamily.get(element.family);
    if (!stats) continue;
    stats.total++;

    const found = implemented.get(element.symbol);
    if (found) {
      stats.covered++;
      // Names are not unique across families (Email is both an object and a
      // property), so the name is compared per symbol rather than by lookup.
      if (found.name !== element.name) {
        mismatchedNames.push({
          symbol: element.symbol,
          implementedName: found.name,
          ontologyName: element.name,
          file: found.file,
        });
      }
    } else {
      stats.missing.push({ id: element.id, symbol: element.symbol, name: element.name });
    }
  }

  for (const [symbol, info] of implemented) {
    if (!ontologyBySymbol.has(symbol)) orphans.push({ symbol, name: info.name, file: info.file });
  }

  let covered = 0;
  let total = 0;
  for (const stats of byFamily.values()) {
    stats.percent = stats.total === 0 ? 0 : Math.round((stats.covered / stats.total) * 100);
    covered += stats.covered;
    total += stats.total;
  }

  return {
    version: ontology.version,
    families: ontology.families.map((f) => byFamily.get(f.id)!),
    covered,
    total,
    percent: total === 0 ? 0 : Math.round((covered / total) * 100),
    mismatchedNames,
    orphans,
    atomFileCount: walk(atomsDir).length,
    ontologyValid: mismatchedNames.length === 0 && orphans.length === 0,
  };
}

function main(): void {
  const ontology = loadOntology();
  const report = buildCoverageReport(ontology, ATOMS_DIR);

  console.log(`Reference implementation coverage (ontology v${report.version})\n`);
  console.log(`${'Family'.padEnd(14)}${'Covered'.padEnd(8)}${'Total'.padEnd(7)}Coverage`);
  console.log('-'.repeat(46));

  for (const stats of report.families) {
    console.log(
      `${stats.family.padEnd(14)}${String(stats.covered).padEnd(8)}${String(stats.total).padEnd(7)}${stats.percent}%`,
    );
  }
  console.log('-'.repeat(46));
  console.log(
    `${'TOTAL'.padEnd(14)}${String(report.covered).padEnd(8)}${String(report.total).padEnd(7)}${report.percent}%\n`,
  );

  if (report.covered < report.total) {
    console.log(`Missing implementations (${report.total - report.covered}):`);
    for (const stats of report.families) {
      if (stats.missing.length === 0) continue;
      console.log(`\n  ${stats.family}:`);
      for (const m of stats.missing) {
        console.log(`    ${String(m.id).padStart(3)} ${m.symbol} ${m.name}`);
      }
    }
  }

  for (const mismatch of report.mismatchedNames) {
    console.error(
      `\n  ERROR: ${mismatch.file} declares ${mismatch.symbol} as "${mismatch.implementedName}" but the ontology calls it "${mismatch.ontologyName}"`,
    );
  }
  for (const orphan of report.orphans) {
    console.error(
      `\n  ERROR: ${orphan.file} implements ${orphan.symbol} ("${orphan.name}"), which is not in the ontology`,
    );
  }
  if (!report.ontologyValid) {
    console.error('\nCoverage cross-check failed: atoms/ and ontology/ disagree.');
    process.exit(1);
  }

  console.log(`\nAtom files: ${report.atomFileCount}`);
}

const invokedDirectly =
  process.argv[1] !== undefined && import.meta.url.endsWith(process.argv[1].split('/').pop() ?? '');
if (invokedDirectly) main();
