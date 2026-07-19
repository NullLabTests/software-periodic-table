import type { AtomMeta, InterfaceSpec } from "../core.js";

export const TableMeta: AtomMeta = {
  id: 93,
  symbol: "Tb",
  name: "Table",
  family: "interfaces",
  description: "Structured rows and columns. The default workhorse view.",
};

export interface TableColumn {
  key: string;
  label: string;
  sortable?: boolean;
  filterable?: boolean;
  width?: string;
}

export interface TableSpec extends InterfaceSpec {
  kind: "Table";
  columns: TableColumn[];
  pageSize?: number;
  rowActions?: string[];
  bulkActions?: string[];
}

export function defineTable(opts: {
  objectType: string;
  columns: TableColumn[];
  pageSize?: number;
  rowActions?: string[];
  bulkActions?: string[];
}): TableSpec {
  return {
    kind: "Table",
    objectType: opts.objectType,
    columns: opts.columns,
    pageSize: opts.pageSize ?? 25,
    rowActions: opts.rowActions ?? ["View", "Update", "Delete"],
    bulkActions: opts.bulkActions ?? [],
    actions: ["Create", "Filter", "Sort", "Export"],
  };
}

/** Minimal pure function that turns data + spec into a renderable structure. */
export function materializeTable(
  spec: TableSpec,
  rows: Record<string, unknown>[]
): {
  columns: TableColumn[];
  rows: Record<string, unknown>[];
  meta: { total: number; pageSize: number };
} {
  return {
    columns: spec.columns,
    rows,
    meta: {
      total: rows.length,
      pageSize: spec.pageSize ?? 25,
    },
  };
}
