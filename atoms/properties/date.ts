import type { AtomMeta } from '../core.js';

export const DateMeta: AtomMeta = {
  id: 38,
  symbol: 'Dt',
  name: 'Date',
  family: 'properties',
  description: 'Calendar date.',
};

export const DateTimeMeta: AtomMeta = {
  id: 39,
  symbol: 'Dm',
  name: 'DateTime',
  family: 'properties',
  description: 'Timestamp with time.',
};

export function formatDate(date: Date): string {
  return date.toISOString().split('T')[0];
}

export function formatDateTime(date: Date): string {
  return date.toISOString();
}
