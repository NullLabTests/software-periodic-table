import type { AtomMeta } from '../core.js';

export const CreatedAtMeta: AtomMeta = {
  id: 52,
  symbol: 'Ca',
  name: 'CreatedAt',
  family: 'properties',
  description: 'Creation timestamp.',
};

export const UpdatedAtMeta: AtomMeta = {
  id: 53,
  symbol: 'Ua',
  name: 'UpdatedAt',
  family: 'properties',
  description: 'Last modification timestamp.',
};

/** Standard audit timestamps. Both are ISO 8601 strings. */
export interface Timestamps {
  createdAt: string;
  updatedAt: string;
}

export function initTimestamps(now: Date = new Date()): Timestamps {
  return { createdAt: now.toISOString(), updatedAt: now.toISOString() };
}

/** Returns a shallow copy with updatedAt advanced to `now`. */
export function touchTimestamps<T extends Timestamps>(entity: T, now: Date = new Date()): T {
  return { ...entity, updatedAt: now.toISOString() };
}
