import type { ActionRequest, AtomMeta } from '../core.js';

export const ActionMeta: AtomMeta = {
  id: 114,
  symbol: 'At',
  name: 'Action',
  family: 'rules',
  description: 'Effect bound to a condition.',
};

/**
 * An effect a rule can run once its condition holds. The action family holds
 * the verbs; this is the rule family's slot for one, so a rule can say what
 * happens without reimplementing how it happens.
 */
export interface RuleAction {
  /** Action verb, matching an action atom by name (e.g. `Notify`, `Create`). */
  action: string;
  targetType?: string;
  /** Resolves the target from the triggering record, e.g. `owner.id`. */
  targetIdField?: string;
  payload?: Record<string, unknown>;
  /** When set, only run this many times per triggering object. */
  maxRunsPerTarget?: number;
}

/**
 * Bind a rule action to the record that triggered the rule, producing the
 * ActionRequest the host executes.
 *
 * A `targetIdField` that resolves to nothing is an error rather than a silent
 * broadcast: an automation that quietly notifies nobody is worse than one that
 * fails loudly.
 */
export function bindRuleAction(
  ruleAction: RuleAction,
  record: Record<string, unknown>,
  actorId?: string,
): { ok: true; request: ActionRequest } | { ok: false; reason: string } {
  const targetId = ruleAction.targetIdField ? String(record[ruleAction.targetIdField] ?? '') : '';

  if (ruleAction.targetIdField && targetId === '') {
    return { ok: false, reason: `targetIdField "${ruleAction.targetIdField}" is absent or empty on the record` };
  }

  const payload = {
    ...ruleAction.payload,
    ...(ruleAction.maxRunsPerTarget === undefined ? {} : { maxRunsPerTarget: ruleAction.maxRunsPerTarget }),
  };

  return {
    ok: true,
    request: {
      action: ruleAction.action,
      targetType: ruleAction.targetType,
      targetId: targetId || undefined,
      payload,
      actorId,
    },
  };
}
