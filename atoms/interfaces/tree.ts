import type { AtomMeta, InterfaceSpec } from '../core.js';

export const TreeMeta: AtomMeta = {
  id: 100,
  symbol: 'Te',
  name: 'Tree',
  family: 'interfaces',
  description: 'Hierarchical structure.',
};

export interface TreeNode {
  /** Key holding the parent id. Records whose parent is absent are roots. */
  parentKey: string;
  /** Key holding this node's own id. Defaults to `id`. */
  idKey?: string;
  titleKey: string;
  expandedByDefault?: boolean;
}

export interface TreeSpec extends InterfaceSpec {
  kind: 'Tree';
  node: TreeNode;
  /** Break ties between siblings sharing a parent, by this field. */
  sortKey?: string;
}

export function defineTree(opts: { objectType: string; node: TreeNode; sortKey?: string }): TreeSpec {
  return {
    kind: 'Tree',
    objectType: opts.objectType,
    node: opts.node,
    sortKey: opts.sortKey,
    actions: ['View', 'Create', 'Update'],
  };
}

export interface TreeEntry {
  id: string;
  parentId: string | null;
  title: string;
  depth: number;
  hasChildren: boolean;
  expanded: boolean;
}

/**
 * Flatten records into depth-annotated tree rows.
 *
 * Two failure modes are handled explicitly because both are silent in a naive
 * walk. A record whose parent id points at nothing is treated as a root and
 * reported in `orphans`, rather than being dropped or recursed into forever. A
 * parent cycle is reported in `cycles` and those records are excluded, since a
 * cycle has no root and would otherwise hang the walk.
 *
 * Depth is capped so a pathological chain cannot produce a stack overflow in
 * whatever renders the rows; nodes past the cap are listed at the cap depth and
 * still returned.
 */
export function materializeTree(
  spec: TreeSpec,
  records: Record<string, unknown>[],
  maxDepth = 32,
): {
  rows: TreeEntry[];
  orphans: { record: Record<string, unknown>; missingParent: string }[];
  cycles: string[][];
  detached: string[];
} {
  const idKey = spec.node.idKey ?? 'id';
  const byId = new Map<string, Record<string, unknown>>();
  for (const record of records) {
    const id = String(record[idKey] ?? '');
    if (id !== '') byId.set(id, record);
  }

  const parentOf = new Map<string, string | null>();
  const orphans: { record: Record<string, unknown>; missingParent: string }[] = [];
  const cycles: string[][] = [];
  const inCycle = new Set<string>();

  for (const [id, record] of byId) {
    const rawParent = record[spec.node.parentKey];
    const parentId = rawParent === undefined || rawParent === null || rawParent === '' ? null : String(rawParent);
    if (parentId === null) {
      parentOf.set(id, null);
      continue;
    }
    if (!byId.has(parentId)) {
      orphans.push({ record, missingParent: parentId });
      parentOf.set(id, null);
      continue;
    }
    parentOf.set(id, parentId);
  }

  const roots: string[] = [];

  // Cycles are checked from every node, not only from roots, because a cycle has
  // no root: walking parents from within one loops forever. Checking only roots
  // would report nothing at all for a mutually-parented pair.
  for (const id of parentOf.keys()) {
    const cycle = findCycle(id, parentOf);
    if (!cycle) continue;
    const known = cycles.some((existing) => existing.slice().sort().join() === cycle.slice().sort().join());
    if (!known) cycles.push(cycle);
    for (const member of cycle) inCycle.add(member);
  }

  for (const [id, parentId] of parentOf) {
    if (parentId !== null || inCycle.has(id)) continue;
    roots.push(id);
  }

  const rows: TreeEntry[] = [];
  const emitted = new Set<string>();

  const walk = (id: string, depth: number): void => {
    if (emitted.has(id) || depth > maxDepth) return;
    const record = byId.get(id);
    if (!record) return;
    emitted.add(id);

    const hasChildren = [...parentOf.entries()].some(([child, parent]) => parent === id && !inCycle.has(child));
    rows.push({
      id,
      parentId: parentOf.get(id) ?? null,
      title: String(record[spec.node.titleKey] ?? ''),
      depth,
      hasChildren,
      expanded: spec.node.expandedByDefault === true && depth < maxDepth,
    });

    const children = [...parentOf.entries()]
      .filter(([child, parent]) => parent === id && !inCycle.has(child))
      .map(([child]) => child)
      .sort((a, b) => compareChildren(a, b, byId, spec.sortKey));

    for (const child of children) walk(child, depth + 1);
  };

  for (const root of roots.sort((a, b) => compareChildren(a, b, byId, spec.sortKey))) walk(root, 0);

  // Anything neither walked nor part of a reported cycle has an ancestry that
  // runs into one. It has no place in the tree, so it is named rather than
  // dropped.
  const detached = [...parentOf.keys()].filter((id) => !emitted.has(id) && !inCycle.has(id)).sort();

  return { rows, orphans, cycles, detached };
}

/**
 * Walk parents to find a cycle, or undefined if this node reaches a root.
 *
 * The `steps` bound is what makes this total: a cycle in the parent map has no
 * root, so without a bound the walk would never terminate.
 */
function findCycle(start: string, parentOf: Map<string, string | null>): string[] | undefined {
  const path: string[] = [];
  const seen = new Map<string, number>();
  let current: string | null = start;

  while (current !== null) {
    const at = seen.get(current);
    if (at !== undefined) return path.slice(at);
    seen.set(current, path.length);
    path.push(current);
    current = parentOf.get(current) ?? null;
  }
  return undefined;
}

function compareChildren(a: string, b: string, byId: Map<string, Record<string, unknown>>, sortKey?: string): number {
  if (!sortKey) return a.localeCompare(b);
  const left = byId.get(a)?.[sortKey];
  const right = byId.get(b)?.[sortKey];
  if (left === right) return a.localeCompare(b);
  if (left === undefined || left === null) return 1;
  if (right === undefined || right === null) return -1;
  return String(left).localeCompare(String(right));
}
