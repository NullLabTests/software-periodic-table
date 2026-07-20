import type { AtomMeta } from '../core.js';

export const AuditMeta: AtomMeta = {
  id: 115,
  symbol: 'Au',
  name: 'Audit',
  family: 'rules',
  description: 'Immutable log of significant events.',
};

export interface AuditEntry {
  id: string;
  timestamp: string;
  actorId: string;
  action: string;
  objectType: string;
  objectId: string;
  changes?: Record<string, { from: unknown; to: unknown }>;
  metadata?: Record<string, unknown>;
}

export function createAuditEntry(opts: {
  id: string;
  actorId: string;
  action: string;
  objectType: string;
  objectId: string;
  changes?: AuditEntry['changes'];
  metadata?: AuditEntry['metadata'];
}): AuditEntry {
  return {
    id: opts.id,
    timestamp: new Date().toISOString(),
    actorId: opts.actorId,
    action: opts.action,
    objectType: opts.objectType,
    objectId: opts.objectId,
    changes: opts.changes,
    metadata: opts.metadata,
  };
}

export function diffObjects(
  before: Record<string, unknown>,
  after: Record<string, unknown>,
): Record<string, { from: unknown; to: unknown }> {
  const changes: Record<string, { from: unknown; to: unknown }> = {};
  for (const key of Object.keys({ ...before, ...after })) {
    if (before[key] !== after[key]) {
      changes[key] = { from: before[key], to: after[key] };
    }
  }
  return changes;
}
