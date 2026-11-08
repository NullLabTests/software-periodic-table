import assert from 'node:assert/strict';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';
import { loadOntology } from '../src/ontology.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function read(relativePath: string): string {
  return fs.readFileSync(path.join(ROOT, relativePath), 'utf8');
}

const ontology = loadOntology();
const pkg = JSON.parse(read('package.json')) as {
  version: string;
  description: string;
  files: string[];
  main: string;
  types: string;
  engines?: Record<string, string>;
  exports: Record<string, unknown>;
};
const lock = JSON.parse(read('package-lock.json')) as {
  version: string;
  packages: Record<string, { version?: string }>;
};
const citation = read('CITATION.cff');
const changelog = read('CHANGELOG.md');
const readme = read('README.md');

describe('project metadata stays in sync', () => {
  it('uses one version across package.json, package-lock.json, the ontology, and CITATION.cff', () => {
    const citationVersion = citation.match(/^version:\s*(\S+)\s*$/m)?.[1];
    assert.ok(citationVersion, 'CITATION.cff has no version field');
    assert.equal(ontology.version, pkg.version, 'ontology version differs from package.json');
    assert.equal(citationVersion, pkg.version, 'CITATION.cff version differs from package.json');
    assert.equal(lock.version, pkg.version, 'package-lock.json version differs from package.json');
    assert.equal(lock.packages['']?.version, pkg.version, 'package-lock.json root package version differs');
  });

  it('has a dated CHANGELOG entry for the shipped version', () => {
    const escaped = pkg.version.replace(/\./g, '\\.');
    const entry = changelog.match(new RegExp(`^## \\[${escaped}\\] - (\\S+)\\s*$`, 'm'));
    assert.ok(entry, `CHANGELOG.md has no entry for ${pkg.version}`);

    const released = citation.match(/^date-released:\s*(\S+)\s*$/m)?.[1];
    assert.equal(released, entry[1], 'CITATION.cff date-released differs from the CHANGELOG date');
  });

  it('quotes the same atom count in the package, README badge, and citation', () => {
    const badgeCount = readme.match(/atoms-(\d+)-/)?.[1];
    const packageCount = pkg.description.match(/(\d+) recurring software elements/)?.[1];
    const citationCount = citation.match(/(\d+) recurring software elements/)?.[1];

    assert.equal(ontology.elements.length, 115);
    assert.equal(Number(badgeCount), ontology.elements.length, 'README atoms badge');
    assert.equal(Number(packageCount), ontology.elements.length, 'package.json description');
    assert.equal(Number(citationCount), ontology.elements.length, 'CITATION.cff abstract');
  });

  it('does not repeat the withdrawn token-efficiency claim in citation metadata', () => {
    assert.doesNotMatch(citation, /token-efficient/i);
  });

  it('ships every file its entry points reference', () => {
    // npm always includes package.json regardless of `files`.
    const shipped = new Set(pkg.files);
    const targets = new Set<string>([pkg.main, pkg.types]);
    for (const target of Object.values(pkg.exports)) {
      const value = (target as { default?: string })?.default ?? (target as string);
      if (typeof value === 'string' && !value.includes('*')) targets.add(value);
    }

    for (const target of targets) {
      if (target === './package.json') continue;
      const topLevel = target.replace(/^\.\//, '').split('/')[0];
      assert.ok(topLevel, `${target} is not a relative path`);
      assert.ok(shipped.has(topLevel), `${target} is not covered by package.json "files"`);
    }

    assert.ok(pkg.engines?.node, 'package.json does not declare a supported Node range');
  });

  it('lists every test file in the README test inventory', () => {
    const testFiles = fs
      .readdirSync(path.join(ROOT, 'test'))
      .filter((name) => name.endsWith('.test.ts'))
      .sort();

    for (const file of testFiles) {
      assert.ok(readme.includes(`test/${file}`), `README test inventory is missing test/${file}`);
    }
  });
});
