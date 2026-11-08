import assert from 'node:assert/strict';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

/** Every hand-written atom module, as a repo-relative path without `.ts`. */
function atomModules(dir: string, found: string[] = []): string[] {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      atomModules(full, found);
    } else if (entry.name.endsWith('.ts') && entry.name !== 'core.ts') {
      found.push(path.relative(path.join(ROOT, 'atoms'), full).replace(/\.ts$/, '').split(path.sep).join('/'));
    }
  }
  return found;
}

/** Atom modules imported by at least one test file. */
function testedModules(): Set<string> {
  const imported = new Set<string>();
  const testDir = path.join(ROOT, 'test');
  for (const file of fs.readdirSync(testDir).filter((name) => name.endsWith('.test.ts'))) {
    const source = fs.readFileSync(path.join(testDir, file), 'utf8');
    for (const match of source.matchAll(/from\s+'\.\.\/atoms\/([^']+)\.js'/g)) {
      if (match[1]) imported.add(match[1]);
    }
  }
  return imported;
}

describe('atom test coverage', () => {
  it('imports every atom module from at least one test', () => {
    // This is a floor, not proof of useful assertions: a module can be imported
    // and never exercised. It does catch the failure mode that existed before
    // v0.6.0, where all 35 object atoms had no test at all.
    const modules = atomModules(path.join(ROOT, 'atoms'));
    const imported = testedModules();
    const untested = modules.filter((module) => !imported.has(module)).sort();

    assert.deepEqual(untested, [], `atom modules with no test import:\n  ${untested.join('\n  ')}`);
  });

  it('finds the atom files it is meant to guard', () => {
    assert.equal(atomModules(path.join(ROOT, 'atoms')).length, 94);
  });
});
