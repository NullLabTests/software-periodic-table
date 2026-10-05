import type { ActionRequest, AtomMeta } from '../core.js';

export const ScheduleRuleMeta: AtomMeta = {
  id: 112,
  symbol: 'Sa',
  name: 'Schedule',
  family: 'rules',
  description: 'Time-based activation.',
};

export interface TimeSchedule {
  id: string;
  name: string;
  objectType: string;
  /** ISO-8601 instant, for a one-shot schedule. */
  at?: string;
  /** RFC-5545-ish recurrence, e.g. `FREQ=DAILY;BYHOUR=9`. */
  rrule?: string;
  timezone?: string;
  actions: ActionRequest[];
  enabled: boolean;
}

/**
 * Build a time-based activation.
 *
 * Exactly one of `at` or `rrule` is required. Accepting both would leave the
 * ambiguity of which wins, and accepting neither would build a rule that never
 * fires while looking configured, so both are rejected.
 */
export function createTimeSchedule(opts: {
  id: string;
  name: string;
  objectType: string;
  at?: string;
  rrule?: string;
  timezone?: string;
  actions: ActionRequest[];
  enabled?: boolean;
}): TimeSchedule {
  if (opts.at && opts.rrule) {
    throw new Error('a schedule has either an instant or a recurrence rule, not both');
  }
  if (!opts.at && !opts.rrule) {
    throw new Error('a schedule needs either an instant or a recurrence rule');
  }
  if (opts.at && Number.isNaN(Date.parse(opts.at))) {
    throw new Error(`at is not a parseable instant: ${opts.at}`);
  }
  if (opts.rrule && !/^FREQ=/.test(opts.rrule)) {
    throw new Error(`rrule must start with FREQ=: ${opts.rrule}`);
  }

  return {
    id: opts.id,
    name: opts.name,
    objectType: opts.objectType,
    at: opts.at,
    rrule: opts.rrule,
    timezone: opts.timezone ?? 'UTC',
    actions: opts.actions,
    enabled: opts.enabled ?? true,
  };
}

/** Schedules eligible to fire at `now`, i.e. enabled and due. */
export function dueSchedules(schedules: TimeSchedule[], now: string): TimeSchedule[] {
  const at = Date.parse(now);
  return schedules.filter((s) => s.enabled && s.at !== undefined && Date.parse(s.at) <= at);
}

/**
 * Whether a recurrence rule covers `now`.
 *
 * Deliberately small: it understands the frequency part of the grammar
 * (`FREQ=SECONDLY|MINUTELY|HOURLY|DAILY|WEEKLY|MONTHLY|YEARLY`) and requires
 * BYxxx parts to match. A full RFC-5545 implementation is the host's job; this
 * exists so a composition can be checked, and it says so rather than pretending
 * to be complete.
 */
export function matchesRecurrence(rrule: string, now: string): boolean {
  const parts = new Map<string, string>();
  for (const chunk of rrule.split(';')) {
    const [key, value] = chunk.split('=');
    if (key && value) parts.set(key.toUpperCase(), value);
  }

  const freq = parts.get('FREQ');
  if (!freq) return false;

  const at = new Date(now);
  if (Number.isNaN(at.getTime())) return false;

  const required: [string, number][] = [
    ['BYMONTH', at.getUTCMonth() + 1],
    ['BYMONTHDAY', at.getUTCDate()],
    ['BYHOUR', at.getUTCHours()],
    ['BYMINUTE', at.getUTCMinutes()],
  ];
  for (const [key, actual] of required) {
    const expected = parts.get(key);
    if (expected !== undefined && !expected.split(',').map(Number).includes(actual)) return false;
  }

  const interval = Number(parts.get('INTERVAL') ?? '1');
  if (!Number.isFinite(interval) || interval < 1) return false;

  switch (freq.toUpperCase()) {
    case 'SECONDLY':
      return true;
    case 'MINUTELY':
      return at.getUTCSeconds() % 60 === 0 || interval === 1;
    case 'HOURLY':
      return at.getUTCMinutes() === 0 || interval === 1;
    case 'DAILY':
      return true;
    case 'WEEKLY': {
      const byDay = parts.get('BYDAY');
      if (!byDay) return true;
      const days = ['SU', 'MO', 'TU', 'WE', 'TH', 'FR', 'SA'];
      return byDay.split(',').includes(days[at.getUTCDay()] ?? '');
    }
    case 'MONTHLY':
      return true;
    case 'YEARLY':
      return true;
    default:
      return false;
  }
}
