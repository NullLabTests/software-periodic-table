import type { ActionRequest, AtomMeta } from '../core.js';

export const SearchMeta: AtomMeta = {
  id: 66,
  symbol: 'Se',
  name: 'Search',
  family: 'actions',
  description: 'Find objects by query.',
};

export const FilterMeta: AtomMeta = {
  id: 67,
  symbol: 'Fi',
  name: 'Filter',
  family: 'actions',
  description: 'Narrow a collection by criteria.',
};

export const SortMeta: AtomMeta = {
  id: 68,
  symbol: 'So',
  name: 'Sort',
  family: 'actions',
  description: 'Order a collection.',
};

export const ExportMeta: AtomMeta = {
  id: 71,
  symbol: 'Ex',
  name: 'Export',
  family: 'actions',
  description: 'Extract data from the system.',
};

export function searchAction(
  targetType: string,
  query: string,
  filters?: Record<string, unknown>,
  actorId?: string,
): ActionRequest {
  return {
    action: 'Search',
    targetType,
    payload: { query, filters },
    actorId,
  };
}

export function filterAction(targetType: string, criteria: Record<string, unknown>, actorId?: string): ActionRequest {
  return {
    action: 'Filter',
    targetType,
    payload: { criteria },
    actorId,
  };
}

export function sortAction(
  targetType: string,
  by: string,
  direction?: 'asc' | 'desc',
  actorId?: string,
): ActionRequest {
  return {
    action: 'Sort',
    targetType,
    payload: { by, direction: direction ?? 'asc' },
    actorId,
  };
}

export function exportAction(
  targetType: string,
  format?: 'csv' | 'json' | 'xlsx',
  filters?: Record<string, unknown>,
  actorId?: string,
): ActionRequest {
  return {
    action: 'Export',
    targetType,
    payload: { format: format ?? 'csv', filters },
    actorId,
  };
}
