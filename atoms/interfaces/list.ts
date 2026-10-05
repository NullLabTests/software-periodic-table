import type { AtomMeta, InterfaceSpec } from '../core.js';

export const ListMeta: AtomMeta = {
  id: 87,
  symbol: 'Ls',
  name: 'List',
  family: 'interfaces',
  description: 'Vertical sequence of items.',
};

export interface ListSpec extends InterfaceSpec {
  kind: 'List';
  primaryKey: string;
  secondaryKeys?: string[];
  /** How many items render before the list is truncated. */
  limit?: number;
  emptyState?: string;
  divider?: boolean;
}

export function defineList(opts: {
  objectType: string;
  primaryKey: string;
  secondaryKeys?: string[];
  limit?: number;
  emptyState?: string;
  divider?: boolean;
}): ListSpec {
  return {
    kind: 'List',
    objectType: opts.objectType,
    primaryKey: opts.primaryKey,
    secondaryKeys: opts.secondaryKeys ?? [],
    limit: opts.limit ?? 50,
    emptyState: opts.emptyState ?? 'Nothing to show',
    divider: opts.divider ?? true,
    actions: ['Create', 'Filter'],
  };
}

export interface ListItem {
  id: string;
  primary: string;
  secondary: string[];
  /** Position in the rendered list, 1-based. */
  position: number;
}

/**
 * Project records into list items.
 *
 * The list is capped at `limit` and reports the true total separately, so a
 * truncated list is visibly truncated rather than quietly short. An item whose
 * primary text is missing still renders, with an empty primary, because a list
 * that drops rows is worse than one with a blank line.
 */
export function materializeList(
  spec: ListSpec,
  records: Record<string, unknown>[],
): {
  items: ListItem[];
  meta: { total: number; shown: number; truncated: boolean };
} {
  const limit = spec.limit ?? 50;
  const shown = records.slice(0, limit);

  const items: ListItem[] = shown.map((record, index) => ({
    id: String(record.id ?? ''),
    primary: text(record[spec.primaryKey]),
    secondary: (spec.secondaryKeys ?? []).map((key) => text(record[key])),
    position: index + 1,
  }));

  return {
    items,
    meta: { total: records.length, shown: items.length, truncated: records.length > items.length },
  };
}

function text(value: unknown): string {
  return value === null || value === undefined ? '' : String(value);
}
