import type { AtomMeta, InterfaceSpec } from '../core.js';

export const FeedMeta: AtomMeta = {
  id: 98,
  symbol: 'Fd',
  name: 'Feed',
  family: 'interfaces',
  description: 'Reverse-chronological activity stream. Ideal for history and audit views.',
};

export interface FeedEntry {
  id: string;
  /** Dotted action name, e.g. `invoice.paid`. */
  verb: string;
  actorId?: string;
  /** Key holding the entry body text. */
  summaryKey?: string;
  timestampKey?: string;
  subjectType?: string;
  subjectId?: string;
}

export interface FeedSpec extends InterfaceSpec {
  kind: 'Feed';
  objectType: string;
  entries: FeedEntry[];
  summaryKey: string;
  timestampKey: string;
  /** Newest first when true. */
  descending?: boolean;
}

export function defineFeed(opts: {
  objectType: string;
  entries: FeedEntry[];
  summaryKey?: string;
  timestampKey?: string;
  descending?: boolean;
}): FeedSpec {
  return {
    kind: 'Feed',
    objectType: opts.objectType,
    entries: opts.entries,
    summaryKey: opts.summaryKey ?? 'summary',
    timestampKey: opts.timestampKey ?? 'createdAt',
    descending: opts.descending ?? true,
    actions: ['View'],
  };
}

export interface FeedItem {
  id: string;
  verb: string;
  summary: string;
  timestamp: string;
  actorId?: string;
  subjectType?: string;
  subjectId?: string;
}

/**
 * Project records into feed items, newest first.
 *
 * Entries whose timestamp is missing sort last rather than being dropped: an
 * undated record is still history, and hiding it would make the feed look
 * complete when it is not.
 */
export function materializeFeed(spec: FeedSpec, items: Record<string, unknown>[]): FeedItem[] {
  const byId = new Map(items.map((item) => [String(item.id ?? ''), item]));
  const projected: FeedItem[] = [];

  for (const entry of spec.entries) {
    const record = byId.get(entry.id);
    if (!record) continue;
    const summaryKey = entry.summaryKey ?? spec.summaryKey;
    const timestampKey = entry.timestampKey ?? spec.timestampKey;
    projected.push({
      id: entry.id,
      verb: entry.verb,
      summary: String(record[summaryKey] ?? ''),
      timestamp: String(record[timestampKey] ?? ''),
      actorId: entry.actorId ?? (record.actorId as string | undefined),
      subjectType: entry.subjectType,
      subjectId: entry.subjectId ?? String(record.id ?? entry.id),
    });
  }

  const direction = spec.descending === false ? 1 : -1;
  return projected.sort((a, b) => {
    if (a.timestamp === b.timestamp) return 0;
    if (a.timestamp === '') return 1;
    if (b.timestamp === '') return -1;
    // `direction` is -1 for newest-first: a later timestamp must sort ahead.
    return a.timestamp > b.timestamp ? direction : -direction;
  });
}
