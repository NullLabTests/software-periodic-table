import type { ActionRequest, AtomMeta } from '../core.js';

export const GroupMeta: AtomMeta = {
  id: 69,
  symbol: 'Gr',
  name: 'Group',
  family: 'actions',
  description: 'Aggregate objects by a property.',
};

export const ImportMeta: AtomMeta = {
  id: 70,
  symbol: 'Im',
  name: 'Import',
  family: 'actions',
  description: 'Bring external data into the system.',
};

export function groupAction(targetType: string, by: string, actorId?: string): ActionRequest {
  return {
    action: 'Group',
    targetType,
    payload: { by },
    actorId,
  };
}

export function importAction(
  targetType: string,
  source: { format: 'csv' | 'json'; uri?: string; rows?: Record<string, unknown>[] },
  opts?: { keyField?: string; onConflict?: 'skip' | 'update' },
  actorId?: string,
): ActionRequest {
  if (!source.uri && !source.rows) {
    throw new Error('an import needs a uri or inline rows');
  }
  return {
    action: 'Import',
    targetType,
    payload: { ...source, keyField: opts?.keyField, onConflict: opts?.onConflict ?? 'skip' },
    actorId,
  };
}

export interface GroupBucket {
  key: string;
  count: number;
  records: Record<string, unknown>[];
}

/**
 * Bucket records by a property.
 *
 * Records missing the grouping key land in their own bucket keyed by the empty
 * string rather than being dropped or throwing. Ungroupable data is usually a
 * data-quality problem the caller needs to see, and hiding it makes the groups
 * look complete.
 */
export function materializeGroups(records: Record<string, unknown>[], by: string): GroupBucket[] {
  const buckets = new Map<string, Record<string, unknown>[]>();

  for (const record of records) {
    const raw = record[by];
    const key = raw === undefined || raw === null ? '' : String(raw);
    const existing = buckets.get(key);
    if (existing) existing.push(record);
    else buckets.set(key, [record]);
  }

  return [...buckets.entries()]
    .map(([key, grouped]) => ({ key, count: grouped.length, records: grouped }))
    .sort((a, b) => a.key.localeCompare(b.key));
}

/**
 * Validate imported rows against a field map, reporting every problem rather
 * than the first.
 *
 * An import that fails on row 400 tells the user nothing about rows 2 through
 * 399, which is the difference between one round trip and many. Unknown fields
 * are reported too: they are usually a typo in the source file that would
 * otherwise be silently dropped.
 */
export function validateImport(
  rows: Record<string, unknown>[],
  fields: { key: string; type: 'string' | 'number' | 'boolean' | 'date' | 'json'; required?: boolean }[],
): {
  valid: boolean;
  rows: { index: number; errors: string[] }[];
  unknownFields: string[];
} {
  const known = new Set(fields.map((f) => f.key));
  const seenFields = new Set<string>();
  const rowsOut: { index: number; errors: string[] }[] = [];

  rows.forEach((row, index) => {
    const errors: string[] = [];
    for (const field of fields) {
      const value = row[field.key];
      if (field.required && (value === undefined || value === null || value === '')) {
        errors.push(`${field.key} is required`);
        continue;
      }
      if (value === undefined || value === null) continue;
      if (!matchesType(value, field.type)) {
        errors.push(`${field.key} is not a ${field.type}: ${JSON.stringify(value)}`);
      }
    }
    for (const key of Object.keys(row)) seenFields.add(key);
    if (errors.length > 0) rowsOut.push({ index, errors });
  });

  const unknownFields = [...seenFields].filter((key) => !known.has(key)).sort();

  return { valid: rowsOut.length === 0 && unknownFields.length === 0, rows: rowsOut, unknownFields };
}

function matchesType(value: unknown, type: 'string' | 'number' | 'boolean' | 'date' | 'json'): boolean {
  switch (type) {
    case 'string':
      return typeof value === 'string';
    case 'number':
      return typeof value === 'number' && Number.isFinite(value);
    case 'boolean':
      return typeof value === 'boolean';
    case 'date':
      return typeof value === 'string' && !Number.isNaN(Date.parse(value));
    case 'json':
      return typeof value === 'object';
    default:
      return false;
  }
}
