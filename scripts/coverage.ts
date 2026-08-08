/**
 * Reports reference-implementation coverage of the ontology.
 *
 * Scans atoms/** for exported AtomMeta declarations (symbol + name) and
 * compares them against ontology/periodic-table.json. Useful for tracking
 * the roadmap goal of covering all 115 elements.
 *
 * Usage: npx tsx scripts/coverage.ts
 */

import * as fs from 'node:fs';
import * as path from 'node:path';

const __dirname = new URL('.', import.meta.url).pathname;
const ONTOLOGY_PATH = path.resolve(__dirname, '../ontology/periodic-table.json');
const ATOMS_DIR = path.resolve(__dirname, '../atoms');

interface OntologyElement {
  id: number;
  symbol: string;
  name: string;
  family: string;
  description: string;
  composesWith?: string[];
}

interface Ontology {
  version: string;
  families: { id: string; name: string; range: [number, number] }[];
  elements: OntologyElement[];
}

const META_PATTERN =
  /(?:export\s+)?(?:const|function)\s+(\w+Meta)\s*[:=][\s\S]*?symbol:\s*'([A-Za-z]{2})'[\s\S]*?name:\s*'([^']+)'/g;

function walk(dir: string, files: string[] = []): string[] {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, files);
    else if (entry.name.endsWith('.ts') && entry.name !== 'core.ts') files.push(full);
  }
  return files;
}

function findAtoms(dir: string): Map<string, string> {
  const implemented = new Map<string, string>();
  for (const file of walk(dir)) {
    const source = fs.readFileSync(file, 'utf8');
    for (const match of source.matchAll(META_PATTERN)) {
      implemented.set(match[2], match[3]);
    }
  }
  return implemented;
}

function main(): void {
  const ontology: Ontology = JSON.parse(fs.readFileSync(ONTOLOGY_PATH, 'utf8'));
  const implemented = findAtoms(ATOMS_DIR);

  const byFamily = new Map<
    string,
    { total: number; covered: number; missing: { id: number; symbol: string; name: string }[] }
  >();
  for (const family of ontology.families) {
    byFamily.set(family.id, { total: 0, covered: 0, missing: [] });
  }

  for (const element of ontology.elements) {
    const stats = byFamily.get(element.family);
    if (!stats) continue;
    stats.total++;
    if (implemented.has(element.symbol)) {
      stats.covered++;
    } else {
      stats.missing.push({ id: element.id, symbol: element.symbol, name: element.name });
    }
  }

  const orphanFiles = walk(ATOMS_DIR)
    .map((file) => path.relative(ATOMS_DIR, file))
    .filter((file) => !file.includes('core.ts'));

  console.log(`Reference implementation coverage (ontology v${ontology.version})\n`);
  console.log(`${'Family'.padEnd(14)}${'Covered'.padEnd(8)}${'Total'.padEnd(7)}Coverage`);
  console.log('-'.repeat(46));

  let totalCovered = 0;
  let totalElements = 0;
  for (const family of ontology.families) {
    const stats = byFamily.get(family.id)!;
    totalCovered += stats.covered;
    totalElements += stats.total;
    const pct = stats.total === 0 ? 0 : Math.round((stats.covered / stats.total) * 100);
    console.log(`${family.id.padEnd(14)}${String(stats.covered).padEnd(8)}${String(stats.total).padEnd(7)}${pct}%`);
  }

  const overallPct = totalElements === 0 ? 0 : Math.round((totalCovered / totalElements) * 100);
  console.log('-'.repeat(46));
  console.log(
    `${'TOTAL'.padEnd(14)}${String(totalCovered).padEnd(8)}${String(totalElements).padEnd(7)}${overallPct}%\n`,
  );

  if (totalCovered < totalElements) {
    console.log(`Missing implementations (${totalElements - totalCovered}):`);
    for (const family of ontology.families) {
      const stats = byFamily.get(family.id)!;
      if (stats.missing.length === 0) continue;
      console.log(`\n  ${family.id}:`);
      for (const m of stats.missing) {
        console.log(`    ${String(m.id).padStart(3)} ${m.symbol} ${m.name}`);
      }
    }
  }

  console.log(`\nAtom files: ${orphanFiles.length}`);
}

main();
