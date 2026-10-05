import type { AtomMeta, InterfaceSpec } from '../core.js';

export const BoardMeta: AtomMeta = {
  id: 94,
  symbol: 'Bd',
  name: 'Board',
  family: 'interfaces',
  description: 'Flexible spatial arrangement.',
};

export interface BoardSlot {
  id: string;
  title: string;
  /** Field on the record a card's membership in this slot reads from. */
  matchKey?: string;
  matchValue?: unknown;
  /** Cards per column before the column scrolls. */
  limit?: number;
}

export interface BoardCard {
  id: string;
  slotId: string;
  title: string;
  subtitle?: string;
}

export interface BoardSpec extends InterfaceSpec {
  kind: 'Board';
  slots: BoardSlot[];
  titleKey: string;
  subtitleKey?: string;
  /** Where an unmatched card goes. */
  fallbackSlotId?: string;
}

export function defineBoard(opts: {
  objectType: string;
  slots: BoardSlot[];
  titleKey?: string;
  subtitleKey?: string;
  fallbackSlotId?: string;
}): BoardSpec {
  return {
    kind: 'Board',
    objectType: opts.objectType,
    slots: opts.slots,
    titleKey: opts.titleKey ?? 'title',
    subtitleKey: opts.subtitleKey,
    fallbackSlotId: opts.fallbackSlotId,
    actions: ['Create', 'Update', 'Filter'],
  };
}

export interface BoardColumn {
  id: string;
  title: string;
  cards: BoardCard[];
  meta: { total: number; shown: number; overflow: boolean };
}

/**
 * Arrange cards across slots.
 *
 * A slot that declares `matchKey` claims every card whose record matches; a slot
 * with no `matchKey` claims everything that no other slot took, which is how a
 * single unfiltered slot is expressed. Cards no slot claims are reported in
 * `unplaced` instead of vanishing, and a per-slot `limit` marks overflow rather
 * than truncating silently.
 */
export function materializeBoard(
  spec: BoardSpec,
  records: Record<string, unknown>[],
): { columns: BoardColumn[]; unplaced: { record: Record<string, unknown>; reason: string }[] } {
  const unplaced: { record: Record<string, unknown>; reason: string }[] = [];
  const claimed = new Set<string>();

  const catchAll = spec.slots.filter((slot) => slot.matchKey === undefined);

  const columns: BoardColumn[] = spec.slots.map((slot) => {
    const cards: BoardCard[] = [];

    for (const record of records) {
      const id = String(record.id ?? '');
      if (claimed.has(id)) continue;
      if (slot.matchKey !== undefined) {
        if (record[slot.matchKey] !== slot.matchValue) continue;
      }
      claimed.add(id);
      cards.push(toCard(spec, id, record, slot.id));
    }

    const limit = slot.limit ?? cards.length;
    const shown = cards.slice(0, limit);
    return {
      id: slot.id,
      title: slot.title,
      cards: shown,
      meta: { total: cards.length, shown: shown.length, overflow: cards.length > shown.length },
    };
  });

  for (const record of records) {
    const id = String(record.id ?? '');
    if (claimed.has(id)) continue;

    const target = spec.fallbackSlotId
      ? columns.find((c) => c.id === spec.fallbackSlotId)
      : catchAll.length > 0
        ? columns.find((c) => c.id === catchAll[0]?.id)
        : undefined;

    if (!target) {
      unplaced.push({ record, reason: 'no slot matched this record and no fallback slot is configured' });
      continue;
    }
    claimed.add(id);
    target.cards.push(toCard(spec, id, record, target.id));
    target.meta.total += 1;
    target.meta.shown += 1;
  }

  return { columns, unplaced };
}

function toCard(spec: BoardSpec, id: string, record: Record<string, unknown>, slotId: string): BoardCard {
  return {
    id,
    slotId,
    title: String(record[spec.titleKey] ?? ''),
    subtitle: spec.subtitleKey && record[spec.subtitleKey] !== undefined ? String(record[spec.subtitleKey]) : undefined,
  };
}
