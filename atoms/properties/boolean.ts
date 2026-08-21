import type { AtomMeta } from '../core.js';

export const BooleanMeta: AtomMeta = {
  id: 37,
  symbol: 'Bl',
  name: 'Boolean',
  family: 'properties',
  description: 'True/false flag.',
};

export type BooleanValue = boolean;

/** Parses common truthy spellings ('yes', 'on', '1', ...) into a boolean. */
export function parseBoolean(value: string | number | boolean): BooleanValue {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'number') return value !== 0;
  const normalized = value.trim().toLowerCase();
  if (['true', 'yes', 'on', '1'].includes(normalized)) return true;
  if (['false', 'no', 'off', '0'].includes(normalized)) return false;
  throw new Error(`Cannot parse "${value}" as boolean`);
}
