import assert from 'node:assert/strict';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';
import { KanbanMeta, type KanbanSpec, materializeKanban } from '../atoms/interfaces/kanban.js';
import { formatTableSummary } from '../composer/prompt.js';
import { validateSchema } from '../src/jsonschema.js';
import { buildNameIndex, loadOntology, loadOntologySchema, symbolIndex } from '../src/ontology.js';

const ontology = loadOntology();

/**
 * These tests import through the same subpaths a consumer uses in `exports`.
 * They run against `src/`, but they fail if the public entry points stop
 * exporting what a consumer needs — which is the only way to catch a broken
 * `exports` map or a renamed symbol before it reaches a published tarball.
 */
describe('public API surface', () => {
  it('exposes the ontology loader', () => {
    assert.equal(ontology.elements.length, 115);
    assert.equal(ontology.families.length, 6);
  });

  it('indexes elements by symbol', () => {
    const bySymbol = symbolIndex(ontology);
    assert.equal(bySymbol.get('Tr')?.name, 'Trigger');
    assert.equal(bySymbol.get('Tk')?.family, 'objects');
    assert.equal(bySymbol.get('Zz'), undefined);
  });

  it('resolves names through the family-aware index', () => {
    const index = buildNameIndex(ontology);
    assert.equal(index.any.get('trigger'), 'Ti', 'last writer wins for ambiguous names');
    assert.equal(index.byFamily.get('actions')?.get('trigger'), 'Tr');
    assert.equal(index.byFamily.get('rules')?.get('trigger'), 'Ti');
    assert.equal(index.byFamily.get('objects')?.get('message'), 'Ms');
    assert.equal(index.byFamily.get('actions')?.get('message'), 'Mg');
    assert.equal(index.byFamily.get('objects')?.get('email'), 'Em');
    assert.equal(index.byFamily.get('properties')?.get('email'), 'Ea');
  });

  it('validates the shipped ontology through the schema entry point', () => {
    assert.deepEqual(validateSchema(ontology, loadOntologySchema()), []);
  });

  it('exposes the composition prompt builder', () => {
    const rules = ontology.elements.filter((e) => e.family === 'rules');
    const summary = formatTableSummary(rules);
    assert.match(summary, /Available Software Periodic Table elements/);
    assert.match(summary, /Pn \(Permission\)/);
  });

  it('exposes atoms with their metadata and behaviour', () => {
    assert.equal(KanbanMeta.symbol, 'Kb');
    assert.equal(KanbanMeta.family, 'interfaces');
    const spec: KanbanSpec = {
      kind: 'Kanban',
      objectType: 'Task',
      cardTitleKey: 'title',
      columns: [{ id: 'todo', title: 'To do', statusValue: 'todo' }],
    };
    const board = materializeKanban(spec, [{ title: 'x', status: 'todo' }]);
    assert.equal(board.todo?.length, 1);
  });

  it('declares package entry points that exist after a build', () => {
    // Guards the `exports` map against drift: every target must be a real file
    // in the published layout. Requires `npm run build` first, and skips rather
    // than fails when it has not run yet, since `npm test` is also useful on a
    // clean checkout.
    const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
    if (!fs.existsSync(path.join(root, 'dist'))) {
      return;
    }
    const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8')) as {
      main: string;
      types: string;
      exports: Record<string, unknown>;
    };
    for (const [key, target] of Object.entries(pkg.exports)) {
      const value = (target as { default?: string })?.default ?? (target as string);
      if (typeof value !== 'string' || value.includes('*')) continue;
      const resolved = path.resolve(root, value);
      assert.ok(fs.existsSync(resolved), `exports["${key}"] points at missing file: ${value}`);
    }
  });
});
