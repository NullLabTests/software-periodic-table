import type { AtomMeta, InterfaceSpec } from '../core.js';

export const CalendarMeta: AtomMeta = {
  id: 89,
  symbol: 'Ce',
  name: 'Calendar',
  family: 'interfaces',
  description: 'Time-based view of events.',
};

export interface CalendarEvent {
  id: string;
  title: string;
  start: string;
  end?: string;
  allDay?: boolean;
  color?: string;
}

export interface CalendarSpec extends InterfaceSpec {
  kind: 'Calendar';
  dateField: string;
  titleField: string;
  views?: ('month' | 'week' | 'day')[];
}

export function defineCalendar(opts: {
  objectType: string;
  dateField: string;
  titleField: string;
  views?: CalendarSpec['views'];
}): CalendarSpec {
  return {
    kind: 'Calendar',
    objectType: opts.objectType,
    dateField: opts.dateField,
    titleField: opts.titleField,
    views: opts.views ?? ['month', 'week', 'day'],
    actions: ['View', 'Create', 'Update'],
  };
}

export function materializeCalendar(
  spec: CalendarSpec,
  items: Record<string, unknown>[],
): { events: CalendarEvent[]; spec: CalendarSpec } {
  const events: CalendarEvent[] = items.map((item) => ({
    id: String(item.id ?? ''),
    title: String(item[spec.titleField] ?? ''),
    start: String(item[spec.dateField] ?? ''),
  }));
  return { events, spec };
}
