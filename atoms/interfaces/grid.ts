import type { AtomMeta, InterfaceSpec } from '../core.js';

export const GridMeta: AtomMeta = {
  id: 86,
  symbol: 'Gd',
  name: 'Grid',
  family: 'interfaces',
  description: 'Tabular data display with cells.',
};

export interface GridColumn {
  key: string;
  label: string;
  width?: string;
  sortable?: boolean;
  filterable?: boolean;
  /** How a cell renders its value. */
  cell?: 'text' | 'number' | 'currency' | 'date' | 'datetime' | 'boolean' | 'badge' | 'link' | 'avatar';
  /** Left, right or center. */
  align?: 'left' | 'center' | 'right';
}

export interface GridSpec extends InterfaceSpec {
  kind: 'Grid';
  columns: GridColumn[];
  pageSize?: number;
  rowActions?: string[];
  selectable?: boolean;
}

export function defineGrid(opts: {
  objectType: string;
  columns: GridColumn[];
  pageSize?: number;
  rowActions?: string[];
  selectable?: boolean;
}): GridSpec {
  return {
    kind: 'Grid',
    objectType: opts.objectType,
    columns: opts.columns,
    pageSize: opts.pageSize ?? 25,
    rowActions: opts.rowActions ?? ['View', 'Update'],
    selectable: opts.selectable ?? false,
    actions: ['Create', 'Filter', 'Sort', 'Export'],
  };
}

export interface GridCell {
  key: string;
  value: unknown;
  display: string;
  align: 'left' | 'center' | 'right';
}

export interface GridRow {
  id: string;
  cells: GridCell[];
}

export interface GridPage {
  columns: GridColumn[];
  rows: GridRow[];
  meta: { total: number; page: number; pageSize: number; pageCount: number };
}

/**
 * Project records into grid cells, one page at a time.
 *
 * A column configured `align: 'right'` is honoured here rather than in a
 * stylesheet, because a numeric column left-aligned is a data-reading error and
 * not only a cosmetic one. A value with no cell renderer is displayed with
 * `String()`, and `null`/`undefined` become an empty string so a blank cell does
 * not read as the text "null".
 */
export function materializeGrid(spec: GridSpec, records: Record<string, unknown>[], page = 1): GridPage {
  const pageSize = spec.pageSize ?? 25;
  const pageCount = Math.max(1, Math.ceil(records.length / pageSize));
  // Clamp rather than return an empty page: a caller asking past the end after
  // a delete wants the last page, not a blank screen it has to detect itself.
  const safePage = Math.min(Math.max(1, page), pageCount);
  const start = (safePage - 1) * pageSize;

  const rows: GridRow[] = records.slice(start, start + pageSize).map((record) => ({
    id: String(record.id ?? ''),
    cells: spec.columns.map((column) => {
      const raw = record[column.key];
      return {
        key: column.key,
        value: raw,
        display: raw === null || raw === undefined ? '' : String(raw),
        align: column.align ?? defaultAlign(column),
      };
    }),
  }));

  return {
    columns: spec.columns,
    rows,
    meta: { total: records.length, page: safePage, pageSize, pageCount },
  };
}

function defaultAlign(column: GridColumn): 'left' | 'center' | 'right' {
  if (column.align) return column.align;
  if (column.cell === 'number' || column.cell === 'currency') return 'right';
  if (column.cell === 'boolean' || column.cell === 'badge' || column.cell === 'avatar') return 'center';
  return 'left';
}
