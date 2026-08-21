import type { AtomMeta } from '../core.js';

export const NumberMeta: AtomMeta = {
  id: 40,
  symbol: 'Nm',
  name: 'Number',
  family: 'properties',
  description: 'Numeric value.',
};

export type NumberValue = number;

export function clampNumber(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export function roundTo(value: number, decimals: number): number {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}
