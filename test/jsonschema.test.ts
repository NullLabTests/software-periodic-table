import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { unsupportedKeywords, validateSchema } from '../src/jsonschema.js';

describe('json schema validator', () => {
  it('accepts a value matching the schema', () => {
    const schema = {
      type: 'object',
      required: ['id'],
      properties: { id: { type: 'integer', minimum: 1, maximum: 10 } },
    };
    assert.deepEqual(validateSchema({ id: 5 }, schema), []);
  });

  it('reports a missing required property', () => {
    const schema = { type: 'object', required: ['id'], properties: {} };
    const errors = validateSchema({}, schema);
    assert.equal(errors.length, 1);
    assert.match(errors[0]?.message ?? '', /missing required property "id"/);
  });

  it('reports a value outside a numeric bound', () => {
    const schema = { type: 'object', properties: { id: { type: 'integer', maximum: 10 } } };
    assert.equal(validateSchema({ id: 11 }, schema).length, 1);
  });

  it('enforces enum', () => {
    const schema = { type: 'object', properties: { family: { enum: ['objects', 'rules'] } } };
    assert.deepEqual(validateSchema({ family: 'rules' }, schema), []);
    assert.equal(validateSchema({ family: 'nope' }, schema).length, 1);
  });

  it('enforces string length and pattern', () => {
    const schema = {
      type: 'object',
      properties: { s: { type: 'string', minLength: 2, maxLength: 3, pattern: '^[A-Z]' } },
    };
    assert.deepEqual(validateSchema({ s: 'Tk' }, schema), []);
    assert.equal(validateSchema({ s: 't' }, schema).length, 2); // too short and bad pattern
    assert.equal(validateSchema({ s: 'Toolong' }, schema).length, 1);
    assert.equal(validateSchema({ s: 'tk' }, schema).length, 1);
  });

  it('enforces array bounds and descends into items', () => {
    const schema = { type: 'object', properties: { xs: { type: 'array', minItems: 2, items: { type: 'integer' } } } };
    assert.deepEqual(validateSchema({ xs: [1, 2] }, schema), []);
    assert.equal(validateSchema({ xs: [1] }, schema).length, 1);
    assert.equal(validateSchema({ xs: [1, 'two'] }, schema).length, 1);
  });

  it('rejects additionalProperties when set to false', () => {
    const schema = { type: 'object', properties: { a: {} }, additionalProperties: false };
    assert.equal(validateSchema({ a: 1, b: 2 }, schema).length, 1);
  });

  it('validates values against additionalProperties as a schema', () => {
    const schema = { type: 'object', properties: {}, additionalProperties: { type: 'string' } };
    assert.deepEqual(validateSchema({ notes: 'ok' }, schema), []);
    assert.equal(validateSchema({ notes: 7 }, schema).length, 1);
  });

  it('enforces const', () => {
    const schema = { type: 'object', properties: { kind: { const: 'Feed' } } };
    assert.deepEqual(validateSchema({ kind: 'Feed' }, schema), []);
    assert.equal(validateSchema({ kind: 'Gallery' }, schema).length, 1);
  });

  // The per-family id bounds in the ontology schema are selected with
  // if/then + const. Before const was supported, every `if` probe passed, so
  // every `then` branch fired at once and a single element produced five errors.
  it('applies only the matching if/then branch', () => {
    const schema = {
      type: 'object',
      properties: {
        family: { type: 'string' },
        id: { type: 'integer' },
      },
      allOf: [
        {
          if: { properties: { family: { const: 'objects' } } },
          // biome-ignore lint/suspicious/noThenProperty: `then` is a JSON Schema applicator keyword, not a promise.
          then: { properties: { id: { minimum: 1, maximum: 35 } } },
        },
        {
          if: { properties: { family: { const: 'rules' } } },
          // biome-ignore lint/suspicious/noThenProperty: `then` is a JSON Schema applicator keyword, not a promise.
          then: { properties: { id: { minimum: 109, maximum: 115 } } },
        },
      ],
    };

    assert.deepEqual(validateSchema({ family: 'objects', id: 10 }, schema), []);
    assert.deepEqual(validateSchema({ family: 'rules', id: 112 }, schema), []);
    assert.equal(validateSchema({ family: 'objects', id: 112 }, schema).length, 1);
    assert.equal(validateSchema({ family: 'rules', id: 10 }, schema).length, 1);
  });

  it('uses the else branch when the if probe fails', () => {
    const schema = {
      allOf: [
        {
          if: { properties: { a: { const: 1 } }, required: ['a'] },
          // biome-ignore lint/suspicious/noThenProperty: `then` is a JSON Schema applicator keyword, not a promise.
          then: { properties: { b: { type: 'string' } } },
          else: { properties: { b: { type: 'integer' } } },
        },
      ],
    };
    assert.deepEqual(validateSchema({ a: 1, b: 'x' }, schema), []);
    assert.equal(validateSchema({ a: 2, b: 'x' }, schema).length, 1);
  });

  it('passes when any anyOf branch matches', () => {
    const schema = { anyOf: [{ type: 'string' }, { type: 'integer' }] };
    assert.deepEqual(validateSchema('x', schema), []);
    assert.deepEqual(validateSchema(3, schema), []);
    assert.equal(validateSchema(true, schema).length, 1);
  });

  it('reports every error, not just the first', () => {
    const schema = {
      type: 'object',
      properties: { a: { type: 'string' }, b: { type: 'string' } },
    };
    assert.equal(validateSchema({ a: 1, b: 2 }, schema).length, 2);
  });
});

describe('unsupported keyword detection', () => {
  it('finds a keyword the validator does not implement', () => {
    const schema = { type: 'object', dependentRequired: { a: ['b'] } };
    assert.deepEqual(unsupportedKeywords(schema), ['#/dependentRequired']);
  });

  it('does not mistake property names under `properties` for keywords', () => {
    // `properties` maps user-chosen names to schemas. Reporting the names as
    // unsupported keywords would flag every property in every schema.
    const schema = {
      type: 'object',
      properties: { version: { type: 'string' }, elements: { type: 'array', items: { type: 'object' } } },
    };
    assert.deepEqual(unsupportedKeywords(schema), []);
  });

  it('descends into property schemas and allOf branches', () => {
    const schema = {
      properties: { nested: { type: 'object', contains: { type: 'string' } } },
      allOf: [{ unevaluatedProperties: false }],
    };
    const found = unsupportedKeywords(schema);
    assert.ok(found.includes('#/properties/nested/contains'));
    assert.ok(found.includes('#/allOf/0/unevaluatedProperties'));
  });

  it('accepts the project ontology schema without reporting gaps', async () => {
    const { loadOntologySchema } = await import('../src/ontology.js');
    assert.deepEqual(unsupportedKeywords(loadOntologySchema()), []);
  });
});

describe('keywords declared in KNOWN_KEYWORDS are actually enforced', () => {
  // A keyword listed as known but never checked would make `unsupportedKeywords`
  // stay silent while validation ignored the constraint, which is the exact
  // failure the module promises to prevent.

  it('enforces uniqueItems', () => {
    const schema = { type: 'array', uniqueItems: true };
    assert.deepEqual(validateSchema([1, 2, 3], schema), []);
    assert.deepEqual(validateSchema([{ a: 1 }, { a: 1 }], schema).length, 1);
    assert.equal(validateSchema([1, 1, 1], schema).length, 3, 'reports every duplicate pair, not just the first');
    assert.deepEqual(validateSchema([{ a: 1 }, { a: 2 }], schema), []);
  });

  it('enforces oneOf as exclusive', () => {
    const schema = { oneOf: [{ type: 'number' }, { type: 'integer' }] };
    // A value satisfying both branches must fail: oneOf means exactly one.
    assert.equal(validateSchema(5, schema).length, 1);
    assert.equal(validateSchema(5.5, schema).length, 0, 'integer branch must not accept 5.5');
    assert.equal(validateSchema('x', schema).length, 1);
  });

  it('enforces not', () => {
    const schema = { not: { type: 'string' } };
    assert.deepEqual(validateSchema(5, schema), []);
    assert.equal(validateSchema('x', schema).length, 1);
  });

  it('reports no unsupported keywords for the full keyword set', () => {
    const schema = {
      type: 'object',
      required: ['a'],
      properties: { a: { type: 'array', uniqueItems: true, items: { anyOf: [{ type: 'string' }] } } },
      additionalProperties: false,
      oneOf: [{ required: ['a'] }, { required: ['b'] }],
      not: { required: ['zzz'] },
    };
    assert.deepEqual(unsupportedKeywords(schema), []);
  });
});
