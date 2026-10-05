import type { AtomMeta, InterfaceSpec } from '../core.js';

export const TimelineMeta: AtomMeta = {
  id: 92,
  symbol: 'Tl',
  name: 'Timeline',
  family: 'interfaces',
  description: 'Chronological sequence.',
};

export interface TimelineEntry {
  id: string;
  timestampKey: string;
  titleKey: string;
  descriptionKey?: string;
  /** Groups entries under a labelled heading, e.g. a month. */
  groupBy?: 'day' | 'month' | 'year' | string;
  accent?: string;
}

export interface TimelineSpec extends InterfaceSpec {
  kind: 'Timeline';
  entries: TimelineEntry[];
  ascending?: boolean;
  showGroups?: boolean;
}

export function defineTimeline(opts: {
  objectType: string;
  entries: TimelineEntry[];
  ascending?: boolean;
  showGroups?: boolean;
}): TimelineSpec {
  return {
    kind: 'Timeline',
    objectType: opts.objectType,
    entries: opts.entries,
    ascending: opts.ascending ?? true,
    showGroups: opts.showGroups ?? true,
    actions: ['View'],
  };
}

export interface TimelineItem {
  id: string;
  timestamp: string;
  title: string;
  description?: string;
  group?: string;
  accent?: string;
}

export interface TimelineGroup {
  label: string;
  items: TimelineItem[];
}

/**
 * Project records into a chronological sequence, grouped.
 *
 * Entries whose timestamp is missing sort last rather than being dropped, in the
 * same spirit as the Feed atom: an undated record is still part of the history,
 * and hiding it makes the timeline look complete. When an entry declares
 * `groupBy`, grouping follows that key; otherwise groups are omitted rather than
 * invented.
 */
export function materializeTimeline(
  spec: TimelineSpec,
  records: Record<string, unknown>[],
): { items: TimelineItem[]; groups: TimelineGroup[] } {
  const projected: TimelineItem[] = [];

  for (const entry of spec.entries) {
    const record = records.find((r) => String(r.id ?? '') === entry.id);
    if (!record) continue;
    const rawTimestamp = record[entry.timestampKey];
    projected.push({
      id: entry.id,
      timestamp: rawTimestamp === null || rawTimestamp === undefined ? '' : String(rawTimestamp),
      title: String(record[entry.titleKey] ?? ''),
      description:
        entry.descriptionKey && record[entry.descriptionKey] !== undefined
          ? String(record[entry.descriptionKey])
          : undefined,
      group: entry.groupBy ? formatGroup(String(record[entry.timestampKey] ?? ''), entry.groupBy) : undefined,
      accent: entry.accent,
    });
  }

  const direction = spec.ascending === false ? -1 : 1;
  const items = projected.sort((a, b) => {
    if (a.timestamp === b.timestamp) return 0;
    if (a.timestamp === '') return 1;
    if (b.timestamp === '') return -1;
    return a.timestamp > b.timestamp ? direction : -direction;
  });

  if (!spec.showGroups) return { items, groups: [] };

  const groups: TimelineGroup[] = [];
  for (const item of items) {
    const label = item.group ?? 'Undated';
    const current = groups[groups.length - 1];
    if (current && current.label === label) current.items.push(item);
    else groups.push({ label, items: [item] });
  }

  return { items, groups };
}

function formatGroup(timestamp: string, granularity: 'day' | 'month' | 'year' | string): string {
  const at = new Date(timestamp);
  if (Number.isNaN(at.getTime())) return 'Undated';
  const year = at.getUTCFullYear();
  const month = String(at.getUTCMonth() + 1).padStart(2, '0');
  const day = String(at.getUTCDate()).padStart(2, '0');

  switch (granularity) {
    case 'year':
      return String(year);
    case 'month':
      return `${year}-${month}`;
    case 'day':
      return `${year}-${month}-${day}`;
    default:
      return `${year}-${month}-${day}`;
  }
}
