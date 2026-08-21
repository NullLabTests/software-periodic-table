import type { AtomMeta } from '../core.js';

export const DurationMeta: AtomMeta = {
  id: 59,
  symbol: 'Du',
  name: 'Duration',
  family: 'properties',
  description: 'Time span.',
};

/** A time span in milliseconds. */
export type DurationMs = number;

const MINUTE_MS = 60_000;
const HOUR_MS = 3_600_000;
const DAY_MS = 86_400_000;

export function minutesToMs(minutes: number): DurationMs {
  return minutes * MINUTE_MS;
}

export function hoursToMs(hours: number): DurationMs {
  return hours * HOUR_MS;
}

export function daysToMs(days: number): DurationMs {
  return days * DAY_MS;
}

/** Formats a duration as a compact human string, e.g. '1d 2h 30m'. */
export function formatDuration(ms: DurationMs): string {
  if (ms < 0) throw new Error('Duration cannot be negative');
  if (ms === 0) return '0m';
  const parts: string[] = [];
  let remaining = ms;
  for (const [unitMs, unit] of [
    [DAY_MS, 'd'],
    [HOUR_MS, 'h'],
    [MINUTE_MS, 'm'],
    [1000, 's'],
  ] as const) {
    if (remaining >= unitMs) {
      parts.push(`${Math.floor(remaining / unitMs)}${unit}`);
      remaining %= unitMs;
    }
  }
  return parts.join(' ');
}
