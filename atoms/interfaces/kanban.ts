import type { AtomMeta, InterfaceSpec } from '../core.js';

export const KanbanMeta: AtomMeta = {
  id: 88,
  symbol: 'Kb',
  name: 'Kanban',
  family: 'interfaces',
  description: 'Column-based status board. Ideal for Task-like objects.',
};

export interface KanbanColumn {
  id: string;
  title: string;
  statusValue: string;
}

export interface KanbanSpec extends InterfaceSpec {
  kind: 'Kanban';
  columns: KanbanColumn[];
  cardTitleKey: string;
  cardSubtitleKey?: string;
}

export function defineKanban(opts: {
  objectType: string;
  columns: KanbanColumn[];
  cardTitleKey?: string;
  cardSubtitleKey?: string;
}): KanbanSpec {
  return {
    kind: 'Kanban',
    objectType: opts.objectType,
    columns: opts.columns,
    cardTitleKey: opts.cardTitleKey ?? 'title',
    cardSubtitleKey: opts.cardSubtitleKey,
    actions: ['Create', 'Update', 'Assign', 'Filter'],
  };
}

export function materializeKanban(
  spec: KanbanSpec,
  items: Record<string, unknown>[],
): Record<string, Record<string, unknown>[]> {
  const board: Record<string, Record<string, unknown>[]> = {};
  for (const col of spec.columns) {
    board[col.id] = [];
  }
  for (const item of items) {
    const status = String(item.status ?? '');
    const col = spec.columns.find((c) => c.statusValue === status);
    if (col) {
      board[col.id].push(item);
    }
  }
  return board;
}
