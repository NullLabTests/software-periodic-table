import type { AtomMeta } from '../core.js';

export const CountMeta: AtomMeta = {
  id: 58,
  symbol: 'Cn',
  name: 'Count',
  family: 'properties',
  description: 'Cardinality or quantity.',
};

/** A non-negative integer. */
export type CountValue = number;

export function isValidCount(value: number): boolean {
  return Number.isInteger(value) && value >= 0;
}
