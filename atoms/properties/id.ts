import type { AtomMeta } from '../core.js';

export const IdMeta: AtomMeta = {
  id: 50,
  symbol: 'Id',
  name: 'ID',
  family: 'properties',
  description: 'Unique identifier.',
};

export type IdValue = string;

/** Generates a unique identifier with an optional type prefix (e.g. 'usr', 'tsk'). */
export function generateId(prefix?: string): string {
  const uuid = globalThis.crypto.randomUUID();
  return prefix ? `${prefix}_${uuid}` : uuid;
}
