/**
 * A small JSON Schema validator covering the subset of draft 2020-12 used by
 * `ontology/periodic-table.schema.json`.
 *
 * Supported keywords: type, required, properties, additionalProperties, enum,
 * pattern, minLength, maxLength, minimum, maximum, items, minItems, maxItems,
 * allOf, anyOf, and if/then/else.
 *
 * The alternative was taking on Ajv as a devDependency. This ontology is the
 * project's whole reason for existing, and it is a JSON file that a reader may
 * well validate with `check-jsonschema` or an editor plugin instead. A tight
 * in-repo implementation keeps the dependency list at zero and is exercised by
 * the test suite, so a schema keyword that goes unsupported fails loudly.
 */

export interface SchemaError {
  path: string;
  message: string;
}

type Schema = boolean | Record<string, unknown>;

function typeOf(value: unknown): string {
  if (value === null) return 'null';
  if (Array.isArray(value)) return 'array';
  if (Number.isInteger(value)) return 'integer';
  return typeof value;
}

function typeMatches(value: unknown, expected: string): boolean {
  const actual = typeOf(value);
  if (expected === 'number') return actual === 'number' || actual === 'integer';
  if (expected === 'integer') return actual === 'integer';
  return actual === expected;
}

function deepEqual(a: unknown, b: unknown): boolean {
  if (a === b) return true;
  if (Array.isArray(a) && Array.isArray(b)) {
    return a.length === b.length && a.every((item, i) => deepEqual(item, b[i]));
  }
  if (a && b && typeof a === 'object' && typeof b === 'object') {
    const ka = Object.keys(a as object);
    const kb = Object.keys(b as object);
    return ka.length === kb.length && ka.every((k) => deepEqual((a as never)[k], (b as never)[k]));
  }
  return false;
}

function validate(value: unknown, schema: Schema, path: string, errors: SchemaError[]): void {
  if (schema === true || schema === undefined) return;
  if (schema === false) {
    errors.push({ path, message: 'schema forbids any value here' });
    return;
  }
  if (typeof schema !== 'object' || schema === null) return;

  const s = schema as Record<string, unknown>;

  if (s.type !== undefined) {
    const expected = Array.isArray(s.type) ? (s.type as string[]) : [s.type as string];
    if (!expected.some((t) => typeMatches(value, t))) {
      errors.push({ path, message: `expected type ${expected.join(' or ')}, got ${typeOf(value)}` });
      return;
    }
  }

  if (s.enum !== undefined && Array.isArray(s.enum)) {
    if (!s.enum.some((option) => deepEqual(option, value))) {
      errors.push({ path, message: `value must be one of ${JSON.stringify(s.enum)}` });
    }
  }

  // `const` matters here beyond equality: the schema selects per-family id
  // bounds with `if: { properties: { family: { const: "objects" } } }`. Without
  // `const` those `if` probes never fail, so every `then` branch fires at once.
  if ('const' in s && !deepEqual(s.const, value)) {
    errors.push({ path, message: `value must equal ${JSON.stringify(s.const)}` });
  }

  if (typeof value === 'string') {
    if (typeof s.minLength === 'number' && value.length < s.minLength) {
      errors.push({ path, message: `string shorter than minLength ${s.minLength}` });
    }
    if (typeof s.maxLength === 'number' && value.length > s.maxLength) {
      errors.push({ path, message: `string longer than maxLength ${s.maxLength}` });
    }
    if (typeof s.pattern === 'string' && !new RegExp(s.pattern).test(value)) {
      errors.push({ path, message: `string does not match pattern ${s.pattern}` });
    }
  }

  if (typeof value === 'number') {
    if (typeof s.minimum === 'number' && value < s.minimum) {
      errors.push({ path, message: `value below minimum ${s.minimum}` });
    }
    if (typeof s.maximum === 'number' && value > s.maximum) {
      errors.push({ path, message: `value above maximum ${s.maximum}` });
    }
  }

  if (Array.isArray(value)) {
    if (typeof s.minItems === 'number' && value.length < s.minItems) {
      errors.push({ path, message: `array has ${value.length} items, minItems is ${s.minItems}` });
    }
    if (typeof s.maxItems === 'number' && value.length > s.maxItems) {
      errors.push({ path, message: `array has ${value.length} items, maxItems is ${s.maxItems}` });
    }
    if (s.items !== undefined) {
      value.forEach((item, i) => {
        validate(item, s.items as Schema, `${path}[${i}]`, errors);
      });
    }
    if (s.uniqueItems === true) {
      for (let i = 0; i < value.length; i += 1) {
        for (let j = i + 1; j < value.length; j += 1) {
          if (deepEqual(value[i], value[j])) {
            errors.push({ path, message: `array items ${i} and ${j} are duplicates` });
          }
        }
      }
    }
  }

  if (value && typeof value === 'object' && !Array.isArray(value)) {
    const record = value as Record<string, unknown>;

    if (Array.isArray(s.required)) {
      for (const key of s.required as string[]) {
        if (!(key in record)) errors.push({ path, message: `missing required property "${key}"` });
      }
    }

    const properties = (s.properties ?? {}) as Record<string, Schema>;
    for (const [key, sub] of Object.entries(properties)) {
      if (key in record) validate(record[key], sub, `${path}.${key}`, errors);
    }

    if (s.additionalProperties !== undefined) {
      for (const key of Object.keys(record)) {
        if (key in properties) continue;
        if (s.additionalProperties === false) {
          errors.push({ path, message: `unexpected property "${key}"` });
        } else {
          validate(record[key], s.additionalProperties as Schema, `${path}.${key}`, errors);
        }
      }
    }
  }

  if (Array.isArray(s.allOf)) {
    for (const sub of s.allOf as Schema[]) validate(value, sub, path, errors);
  }

  if (Array.isArray(s.anyOf)) {
    const branches = s.anyOf as Schema[];
    const branchErrors = branches.map((sub) => {
      const local: SchemaError[] = [];
      validate(value, sub, path, local);
      return local;
    });
    if (branchErrors.every((e) => e.length > 0)) {
      errors.push({ path, message: 'value matched none of the anyOf branches' });
    }
  }

  if (Array.isArray(s.oneOf)) {
    const matched = (s.oneOf as Schema[]).filter((sub) => {
      const local: SchemaError[] = [];
      validate(value, sub, path, local);
      return local.length === 0;
    });
    // `oneOf` is exclusive: exactly one branch, not "at least one" as in anyOf.
    if (matched.length !== 1) {
      errors.push({ path, message: `value matched ${matched.length} oneOf branches, expected exactly 1` });
    }
  }

  if (s.not !== undefined) {
    const local: SchemaError[] = [];
    validate(value, s.not as Schema, path, local);
    if (local.length === 0) {
      errors.push({ path, message: 'value matched a schema that `not` forbids' });
    }
  }

  if (s.if !== undefined) {
    const probe: SchemaError[] = [];
    validate(value, s.if as Schema, path, probe);
    if (probe.length === 0) {
      if (s.then !== undefined) validate(value, s.then as Schema, path, errors);
    } else if (s.else !== undefined) {
      validate(value, s.else as Schema, path, errors);
    }
  }
}

/** Validate `value` against `schema`, returning every violation found. */
export function validateSchema(value: unknown, schema: Schema): SchemaError[] {
  const errors: SchemaError[] = [];
  validate(value, schema, '$', errors);
  return errors;
}

/**
 * Keywords this implementation does not understand. A schema using one of these
 * would validate as if the keyword were absent, which is worse than not
 * supporting it — so the caller can surface the gap.
 */
const KNOWN_KEYWORDS = new Set([
  '$schema',
  '$id',
  '$comment',
  'title',
  'description',
  'default',
  'examples',
  'type',
  'required',
  'properties',
  'additionalProperties',
  'enum',
  'const',
  'pattern',
  'minLength',
  'maxLength',
  'minimum',
  'maximum',
  'items',
  'minItems',
  'maxItems',
  'uniqueItems',
  'allOf',
  'anyOf',
  'oneOf',
  'not',
  'if',
  'then',
  'else',
]);

/**
 * Keywords whose value is a single sub-schema, or a list of sub-schemas.
 * Every other keyword is either a scalar assertion or a map whose keys are
 * user-chosen names, and so must not be descended into as though it were a schema.
 */
const SUBSCHEMA_KEYWORDS = new Set(['additionalProperties', 'items', 'not', 'if', 'then', 'else']);
const SUBSCHEMA_LIST_KEYWORDS = new Set(['allOf', 'anyOf', 'oneOf']);
/** Keywords whose value is a map from an arbitrary name to a sub-schema. */
const SUBSCHEMA_MAP_KEYWORDS = new Set(['properties', 'patternProperties', 'definitions', '$defs']);

export function unsupportedKeywords(schema: unknown, path = '#'): string[] {
  if (Array.isArray(schema)) {
    return schema.flatMap((item, i) => unsupportedKeywords(item, `${path}/${i}`));
  }
  if (!schema || typeof schema !== 'object') return [];

  const found: string[] = [];
  for (const [key, value] of Object.entries(schema as Record<string, unknown>)) {
    if (SUBSCHEMA_MAP_KEYWORDS.has(key)) {
      // Keys here are names chosen by the schema author, not keywords.
      for (const [name, sub] of Object.entries((value ?? {}) as Record<string, unknown>)) {
        found.push(...unsupportedKeywords(sub, `${path}/${key}/${name}`));
      }
      continue;
    }
    if (SUBSCHEMA_LIST_KEYWORDS.has(key)) {
      found.push(...unsupportedKeywords(value, `${path}/${key}`));
      continue;
    }
    if (SUBSCHEMA_KEYWORDS.has(key)) {
      found.push(...unsupportedKeywords(value, `${path}/${key}`));
      continue;
    }
    if (!KNOWN_KEYWORDS.has(key)) {
      found.push(`${path}/${key}`);
    }
  }
  return found;
}
