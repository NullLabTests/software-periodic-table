import assert from 'node:assert/strict';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { describe, it } from 'node:test';
import { buildCoverageReport } from '../scripts/coverage.js';
import { validateOntology } from '../scripts/validate-ontology.js';
import { loadOntology, loadOntologySchema, type Ontology } from '../src/ontology.js';

const ontology = loadOntology();
const schema = loadOntologySchema();

/** Deep clone so each mutation test starts from the real ontology. */
function clone(): Ontology {
  return JSON.parse(JSON.stringify(ontology)) as Ontology;
}

/** Checked element accessor: fails the test loudly instead of throwing on undefined. */
function el(target: Ontology, index: number): Ontology['elements'][number] {
  const element = target.elements[index];
  assert.ok(element, `no element at index ${index}`);
  return element;
}

function messages(report: { findings: { severity: string; message: string }[] }): string[] {
  return report.findings.map((f) => `${f.severity}: ${f.message}`);
}

describe('the shipped ontology', () => {
  it('passes validation with no errors and no warnings', () => {
    const report = validateOntology(ontology, schema);
    assert.deepEqual(
      messages(report).filter((m) => m.startsWith('ERROR')),
      [],
    );
    assert.deepEqual(
      messages(report).filter((m) => m.startsWith('WARN')),
      [],
    );
    assert.equal(report.ok, true);
  });

  it('has 115 elements across 6 families with unique ids and symbols', () => {
    assert.equal(ontology.elements.length, 115);
    assert.equal(ontology.families.length, 6);
    assert.equal(new Set(ontology.elements.map((e) => e.id)).size, 115);
    assert.equal(new Set(ontology.elements.map((e) => e.symbol)).size, 115);
  });

  it('gives every element a two-character symbol and a description', () => {
    for (const element of ontology.elements) {
      assert.equal(element.symbol.length, 2, `symbol of ${element.name}`);
      assert.ok(element.description.length > 0, `description of ${element.name}`);
    }
  });

  it('declares composesWith on every element', () => {
    const without = ontology.elements.filter((e) => !e.composesWith || e.composesWith.length === 0);
    assert.deepEqual(
      without.map((e) => `${e.id}:${e.symbol}`),
      [],
    );
  });

  it('only ever composes with elements that exist', () => {
    const symbols = new Set(ontology.elements.map((e) => e.symbol));
    for (const element of ontology.elements) {
      for (const ref of element.composesWith ?? []) {
        assert.ok(symbols.has(ref), `${element.symbol} composes with unknown ${ref}`);
        assert.notEqual(ref, element.symbol, `${element.symbol} composes with itself`);
      }
    }
  });

  it('keeps every id inside its own family range', () => {
    for (const family of ontology.families) {
      const [low, high] = family.range;
      for (const element of ontology.elements.filter((e) => e.family === family.id)) {
        assert.ok(
          element.id >= low && element.id <= high,
          `${element.symbol} id ${element.id} outside ${family.id} [${low}, ${high}]`,
        );
      }
    }
  });

  it('allocates every id in every family range', () => {
    for (const family of ontology.families) {
      const [low, high] = family.range;
      for (let id = low; id <= high; id++) {
        assert.ok(
          ontology.elements.some((e) => e.id === id && e.family === family.id),
          `id ${id} unallocated in ${family.id}`,
        );
      }
    }
  });
});

describe('validator catches ontology defects', () => {
  it('flags a duplicate id', () => {
    const broken = clone();
    el(broken, 1).id = el(broken, 0).id;
    const report = validateOntology(broken, schema);
    assert.ok(messages(report).some((m) => m.includes('duplicate element id')));
  });

  it('flags the same id claimed by two different elements', () => {
    const broken = clone();
    // Move a properties element's id onto an existing object id: schema bounds
    // catch the range, and the cross-family claim check should fire too.
    el(broken, 40).id = el(broken, 0).id;
    el(broken, 40).family = 'objects';
    const report = validateOntology(broken, schema);
    assert.ok(messages(report).some((m) => /outside range|is claimed by both/.test(m)));
  });

  it('flags a duplicate symbol', () => {
    const broken = clone();
    el(broken, 1).symbol = el(broken, 0).symbol;
    const report = validateOntology(broken, schema);
    assert.ok(messages(report).some((m) => m.includes('duplicate symbol')));
  });

  it('flags a symbol that is not two characters', () => {
    const broken = clone();
    el(broken, 0).symbol = 'Task';
    const report = validateOntology(broken, schema);
    assert.ok(messages(report).some((m) => m.includes('is not exactly 2 characters')));
  });

  it('flags an id outside its family range', () => {
    const broken = clone();
    el(broken, 0).id = 200;
    const report = validateOntology(broken, schema);
    assert.ok(messages(report).some((m) => m.includes('outside range')));
  });

  it('flags an unknown family', () => {
    const broken = clone();
    el(broken, 0).family = 'widgets';
    const report = validateOntology(broken, schema);
    assert.ok(messages(report).some((m) => m.includes('unknown family')));
  });

  it('flags a composesWith reference to an undefined symbol', () => {
    const broken = clone();
    el(broken, 0).composesWith = ['Zz'];
    const report = validateOntology(broken, schema);
    assert.ok(messages(report).some((m) => m.includes('composesWith unknown symbol "Zz"')));
  });

  it('flags self-composition as a warning, not an error', () => {
    const broken = clone();
    el(broken, 0).composesWith = [el(broken, 0).symbol];
    const report = validateOntology(broken, schema);
    assert.ok(report.ok, 'self-composition should not fail the run');
    assert.ok(messages(report).some((m) => m.startsWith('WARN') && m.includes('composesWith itself')));
  });

  it('flags a repeated entry in one composesWith list', () => {
    const broken = clone();
    const other = el(broken, 1).symbol;
    el(broken, 0).composesWith = [other, other];
    const report = validateOntology(broken, schema);
    assert.ok(messages(report).some((m) => m.startsWith('WARN') && m.includes('more than once')));
  });

  it('flags an unallocated id in a family range', () => {
    const broken = clone();
    broken.elements = broken.elements.filter((e) => e.id !== 3);
    const report = validateOntology(broken, schema);
    assert.ok(messages(report).some((m) => m.includes('unallocated id 3')));
  });

  it('flags a duplicate name within one family as a warning', () => {
    const broken = clone();
    el(broken, 1).name = el(broken, 0).name;
    const report = validateOntology(broken, schema);
    assert.ok(messages(report).some((m) => m.startsWith('WARN') && m.includes('duplicate name in family')));
  });

  it('treats a name reused across families as intentional', () => {
    const report = validateOntology(ontology, schema);
    assert.ok(
      messages(report).some((m) => m.startsWith('INFO') && m.includes('reused across families')),
      'Email/Message/Search/Trigger/Schedule are each in two families',
    );
  });

  it('exits non-zero when there is an error', () => {
    const broken = clone();
    el(broken, 1).symbol = el(broken, 0).symbol;
    assert.equal(validateOntology(broken, schema).ok, false);
  });
});

describe('reference implementation coverage', () => {
  const report = buildCoverageReport(ontology);

  it('has no atom whose symbol is missing from the ontology', () => {
    assert.deepEqual(report.orphans, []);
  });

  it('has no atom whose name disagrees with the ontology', () => {
    assert.deepEqual(report.mismatchedNames, []);
  });

  it('agrees with the ontology on family totals', () => {
    for (const family of report.families) {
      const expected = ontology.elements.filter((e) => e.family === family.family).length;
      assert.equal(family.total, expected, family.family);
      assert.equal(family.covered + family.missing.length, family.total, family.family);
    }
  });

  it('reports 94 of 115 atoms implemented', () => {
    // Pinned deliberately. Adding or removing an atom should break this test on
    // purpose: the same numbers are quoted in README.md (Status, Limitations,
    // Roadmap), so failing here is the reminder to update the documentation.
    assert.equal(report.covered, 94);
    assert.equal(report.total, 115);
    assert.equal(report.percent, 82);
  });

  it('covers every family it claims to cover completely', () => {
    for (const family of report.families) {
      if (['objects', 'properties', 'intelligence'].includes(family.family)) {
        assert.equal(family.percent, 100, family.family);
      }
    }
  });

  it('detects an atom implemented for a symbol outside the ontology', () => {
    // Synthetic dir with one bad symbol, to prove the orphan check has teeth.
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'spt-cov-'));
    fs.writeFileSync(
      path.join(dir, 'bogus.ts'),
      "export const BogusMeta = { id: 1, symbol: 'Zz', name: 'Bogus', family: 'objects', description: 'x' };",
    );
    const bad = buildCoverageReport(ontology, dir);
    assert.equal(bad.orphans.length, 1);
    assert.equal(bad.orphans[0]?.symbol, 'Zz');
    assert.equal(bad.ontologyValid, false);
    fs.rmSync(dir, { recursive: true, force: true });
  });
});
