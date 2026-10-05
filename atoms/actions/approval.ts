import type { ActionRequest, AtomMeta } from '../core.js';

export const ApproveMeta: AtomMeta = {
  id: 76,
  symbol: 'Ap',
  name: 'Approve',
  family: 'actions',
  description: 'Grant approval.',
};

export const RejectMeta: AtomMeta = {
  id: 77,
  symbol: 'Rj',
  name: 'Reject',
  family: 'actions',
  description: 'Deny approval.',
};

export const EscalateMeta: AtomMeta = {
  id: 80,
  symbol: 'Es',
  name: 'Escalate',
  family: 'actions',
  description: 'Raise priority or hand off.',
};

export interface ApprovalDecision {
  targetType: string;
  targetId: string;
  /** Free text explaining a rejection or escalation. */
  reason?: string;
  actorId?: string;
}

/**
 * The approval states these actions operate on.
 *
 * `Approve` and `Reject` are both terminal for a request: once a decision is
 * recorded the request is decided, and escalating a decided request is a bug in
 * the caller rather than something to silently accept.
 */
export type ApprovalState = 'pending' | 'approved' | 'rejected' | 'escalated';

export function approveAction(targetType: string, targetId: string, comment?: string, actorId?: string): ActionRequest {
  return {
    action: 'Approve',
    targetType,
    targetId,
    payload: { decision: 'approved' satisfies ApprovalState, comment, decidedAt: new Date().toISOString() },
    actorId,
  };
}

export function rejectAction(targetType: string, targetId: string, reason: string, actorId?: string): ActionRequest {
  return {
    action: 'Reject',
    targetType,
    targetId,
    payload: { decision: 'rejected' satisfies ApprovalState, reason, decidedAt: new Date().toISOString() },
    actorId,
  };
}

export function escalateAction(
  targetType: string,
  targetId: string,
  opts: { reason?: string; newPriority?: string; to?: string },
  actorId?: string,
): ActionRequest {
  return {
    action: 'Escalate',
    targetType,
    targetId,
    payload: { decision: 'escalated' satisfies ApprovalState, ...opts, escalatedAt: new Date().toISOString() },
    actorId,
  };
}

/**
 * Apply an approval decision to a record.
 *
 * A decision can only be taken from `pending`, and a rejection must carry a
 * reason: a denied request with no explanation is unactionable for whoever
 * submitted it. Both are returned as structured failures instead of throwing so
 * a caller processing a batch can collect them.
 */
export function applyDecision(
  record: Record<string, unknown>,
  decision: ApprovalDecision & { decision: ApprovalState },
): { ok: true; record: Record<string, unknown> } | { ok: false; reason: string } {
  const state = (record.approvalState as ApprovalState | undefined) ?? 'pending';

  if (state !== 'pending') {
    return { ok: false, reason: `request is already ${state}` };
  }
  if (decision.decision === 'rejected' && !decision.reason) {
    return { ok: false, reason: 'a rejection must state a reason' };
  }

  return {
    ok: true,
    record: {
      ...record,
      approvalState: decision.decision,
      approvalReason: decision.reason,
      decidedBy: decision.actorId,
      decidedAt: new Date().toISOString(),
    },
  };
}
