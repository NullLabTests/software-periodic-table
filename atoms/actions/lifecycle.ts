import type { ActionRequest, AtomMeta } from '../core.js';

export const DuplicateMeta: AtomMeta = {
  id: 72,
  symbol: 'Dp',
  name: 'Duplicate',
  family: 'actions',
  description: 'Create a copy of an object.',
};

export const ArchiveMeta: AtomMeta = {
  id: 78,
  symbol: 'Ar',
  name: 'Archive',
  family: 'actions',
  description: 'Move to long-term storage.',
};

export const RestoreMeta: AtomMeta = {
  id: 79,
  symbol: 'Rs',
  name: 'Restore',
  family: 'actions',
  description: 'Recover from archive or deletion.',
};

/**
 * Fields a copy must not inherit. A duplicate that keeps the original's `id`
 * would collide with it, and one that keeps `createdAt` would falsify history,
 * so both are reset by `duplicateAction` unless the caller overrides them.
 */
export const DUPLICATE_RESET_FIELDS = ['id', 'createdAt', 'updatedAt'] as const;

export function duplicateAction(
  targetType: string,
  sourceId: string,
  overrides?: Record<string, unknown>,
  actorId?: string,
): ActionRequest {
  return {
    action: 'Duplicate',
    targetType,
    targetId: sourceId,
    payload: { sourceId, overrides, resetFields: [...DUPLICATE_RESET_FIELDS] },
    actorId,
  };
}

export function archiveAction(targetType: string, targetId: string, actorId?: string): ActionRequest {
  return {
    action: 'Archive',
    targetType,
    targetId,
    payload: { archivedAt: new Date().toISOString() },
    actorId,
  };
}

export function restoreAction(targetType: string, targetId: string, actorId?: string): ActionRequest {
  return {
    action: 'Restore',
    targetType,
    targetId,
    actorId,
  };
}

/**
 * Whether a record is currently restorable.
 *
 * A record that was never archived cannot be restored, and one already live
 * does not need it. Both are reported as `false` rather than throwing so a
 * bulk-restore can skip them and say so.
 */
export function isRestorable(record: Record<string, unknown>): boolean {
  if (record.archivedAt !== undefined && record.archivedAt !== null) return true;
  return record.deletedAt !== undefined && record.deletedAt !== null;
}

/**
 * Build the updated record for a restore, clearing whichever marker put it away.
 *
 * Both markers are cleared when both are present: a soft-deleted record that was
 * also archived has to come back fully, or it is restored into a state the user
 * already asked to leave.
 */
export function applyRestore(record: Record<string, unknown>): Record<string, unknown> {
  const next = { ...record };
  delete next.archivedAt;
  delete next.deletedAt;
  return next;
}

/**
 * Split records into restored and skipped, keeping the reason for each skip.
 *
 * Callers get a report rather than a silent subset, because a restore that
 * quietly drops half its input looks identical to one that succeeded.
 */
export function partitionRestorable(records: Record<string, unknown>[]): {
  restored: Record<string, unknown>[];
  skipped: { record: Record<string, unknown>; reason: string }[];
} {
  const restored: Record<string, unknown>[] = [];
  const skipped: { record: Record<string, unknown>; reason: string }[] = [];

  for (const record of records) {
    if (!isRestorable(record)) {
      skipped.push({ record, reason: 'record is neither archived nor deleted' });
      continue;
    }
    restored.push(applyRestore(record));
  }

  return { restored, skipped };
}
