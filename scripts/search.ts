/**
 * Search the ontology by name, symbol, or description.
 *
 *   npm run search -- subscription
 *   npm run search -- "invoice" --family objects
 *   npm run search -- --symbol Tk
 *
 * Used by the ontology proposal issue template: a proposal for a concept that
 * already exists, or that `composesWith` already covers, is worth catching
 * before it is written.
 */

import { loadOntology, type OntologyElement } from '../src/ontology.js';

interface Options {
  terms: string[];
  family?: string;
  symbol?: string;
  list: boolean;
}

function parseArgs(argv: string[]): Options {
  const terms: string[] = [];
  let family: string | undefined;
  let symbol: string | undefined;
  let list = false;

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--family' || arg === '-f') {
      family = argv[i + 1];
      i += 1;
    } else if (arg?.startsWith('--family=')) {
      family = arg.slice('--family='.length);
    } else if (arg === '--symbol' || arg === '-s') {
      symbol = argv[i + 1];
      i += 1;
    } else if (arg?.startsWith('--symbol=')) {
      symbol = arg.slice('--symbol='.length);
    } else if (arg === '--list' || arg === '-l') {
      list = true;
    } else if (arg === '--help' || arg === '-h') {
      printUsage();
      process.exit(0);
    } else if (arg) {
      terms.push(arg.toLowerCase());
    }
  }

  return { terms, family, symbol, list };
}

function printUsage(): void {
  process.stdout.write(
    [
      'Usage: npm run search -- [options] [terms...]',
      '',
      'Options:',
      '  -f, --family <name>   restrict to one family',
      '  -s, --symbol <sym>    look up one exact symbol',
      '  -l, --list            list every element',
      '  -h, --help            show this message',
      '',
      'With no terms, lists the whole table.',
      '',
    ].join('\n'),
  );
}

function matches(element: OntologyElement, terms: string[]): boolean {
  if (terms.length === 0) return true;
  const haystack = `${element.name} ${element.symbol} ${element.description} ${element.family}`.toLowerCase();
  // Every term must appear somewhere: "invoice rule" narrows, it does not widen.
  return terms.every((term) => haystack.includes(term));
}

function printTable(rows: OntologyElement[]): void {
  const idWidth = Math.max(3, ...rows.map((e) => String(e.id).length));
  const symbolWidth = Math.max(6, ...rows.map((e) => e.symbol.length));
  const nameWidth = Math.max(4, ...rows.map((e) => e.name.length));

  for (const element of rows) {
    const id = String(element.id).padStart(idWidth);
    const symbol = element.symbol.padEnd(symbolWidth);
    const name = element.name.padEnd(nameWidth);
    const family = element.family.padEnd(12);
    process.stdout.write(`${id}  ${symbol}  ${name}  ${family}  ${element.description}\n`);
  }
}

function main(): void {
  const ontology = loadOntology();
  const options = parseArgs(process.argv.slice(2));

  if (options.list) {
    printTable(ontology.elements);
    process.stdout.write(`\n${ontology.elements.length} elements\n`);
    return;
  }

  if (options.symbol) {
    const found = ontology.elements.find((e) => e.symbol.toLowerCase() === options.symbol?.toLowerCase());
    if (!found) {
      process.stderr.write(`No element with symbol "${options.symbol}"\n`);
      process.exit(1);
    }
    printTable([found]);
    return;
  }

  const rows = ontology.elements.filter(
    (element) => (!options.family || element.family === options.family) && matches(element, options.terms),
  );

  if (rows.length === 0) {
    process.stdout.write('No matching elements.\n');
    return;
  }

  printTable(rows);
  process.stdout.write(`\n${rows.length} of ${ontology.elements.length} elements\n`);
}

main();
