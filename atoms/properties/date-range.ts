import type { AtomMeta } from '../core.js';

export const StartDateMeta: AtomMeta = {
  id: 54,
  symbol: 'Sd',
  name: 'StartDate',
  family: 'properties',
  description: 'Begin timestamp or date.',
};

export const EndDateMeta: AtomMeta = {
  id: 55,
  symbol: 'Ed',
  name: 'EndDate',
  family: 'properties',
  description: 'End timestamp or date.',
};

export interface DateRange {
  /** ISO 8601. */
  start: string;
  /** ISO 8601. */
  end: string;
}

export function isValidRange(range: DateRange): boolean {
  return new Date(range.start).getTime() <= new Date(range.end).getTime();
}

/** Duration of the range in milliseconds (0 if the range is invalid). */
export function rangeDurationMs(range: DateRange): number {
  return Math.max(0, new Date(range.end).getTime() - new Date(range.start).getTime());
}
