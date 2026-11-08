/**
 * Package root entry point.
 *
 * The package previously advertised `atoms/core.ts` as its `main`, but that
 * module contains only types and compiles to `export {}`. Importing the package
 * by name therefore yielded an empty namespace. This module gives the root a
 * real runtime surface while re-exporting the same core types, so existing
 * `import type { Atom } from 'software-periodic-table'` statements keep working.
 *
 * Consumers that want a single atom should keep using the per-atom subpaths
 * (`software-periodic-table/atoms/objects/task.js`); this root is the shared
 * infrastructure: ontology loading, schema validation, and composition prompts.
 */

export * from '../atoms/core.js';
export * from '../composer/prompt.js';
export * from './jsonschema.js';
export * from './ontology.js';
