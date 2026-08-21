import type { AtomMeta } from '../core.js';
import { clampNumber } from './number.js';

export const PercentMeta: AtomMeta = {
  id: 42,
  symbol: 'Pc',
  name: 'Percent',
  family: 'properties',
  description: 'Percentage value.',
};

/** A percentage in the range [0, 100]. */
export type PercentValue = number;

export function clampPercent(value: number): PercentValue {
  return clampNumber(value, 0, 100);
}

export function formatPercent(value: number, decimals = 0): string {
  return `${clampPercent(value).toFixed(decimals)}%`;
}
