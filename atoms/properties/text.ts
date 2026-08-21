import type { AtomMeta } from '../core.js';

export const TextMeta: AtomMeta = {
  id: 43,
  symbol: 'Tx',
  name: 'Text',
  family: 'properties',
  description: 'Free-form string.',
};

export type TextValue = string;

export function isEmptyText(value: string): boolean {
  return value.trim().length === 0;
}

export function truncateText(value: string, maxLength: number): string {
  if (value.length <= maxLength) return value;
  return `${value.slice(0, Math.max(0, maxLength - 1))}…`;
}
