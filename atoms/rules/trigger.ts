import type { ActionRequest, AtomMeta } from '../core.js';

export const TriggerMeta: AtomMeta = {
  id: 111,
  symbol: 'Ti',
  name: 'Trigger',
  family: 'rules',
  description: 'Event that starts automation.',
};

export const ConditionMeta: AtomMeta = {
  id: 113,
  symbol: 'Cv',
  name: 'Condition',
  family: 'rules',
  description: 'Boolean predicate for branching.',
};

export interface TriggerCondition {
  field: string;
  operator: 'eq' | 'neq' | 'gt' | 'gte' | 'lt' | 'lte' | 'in' | 'contains' | 'changed_to';
  value: unknown;
}

export interface TriggerRule {
  id: string;
  name: string;
  event: string;
  objectType: string;
  conditions?: TriggerCondition[];
  actions: ActionRequest[];
  enabled: boolean;
}

export function createTriggerRule(opts: {
  id: string;
  name: string;
  event: string;
  objectType: string;
  conditions?: TriggerCondition[];
  actions: ActionRequest[];
  enabled?: boolean;
}): TriggerRule {
  return {
    id: opts.id,
    name: opts.name,
    event: opts.event,
    objectType: opts.objectType,
    conditions: opts.conditions,
    actions: opts.actions,
    enabled: opts.enabled ?? true,
  };
}

export function evaluateConditions(conditions: TriggerCondition[], data: Record<string, unknown>): boolean {
  return conditions.every((c) => {
    const val = data[c.field];
    switch (c.operator) {
      case 'eq':
        return val === c.value;
      case 'neq':
        return val !== c.value;
      case 'changed_to':
        return val === c.value;
      case 'in':
        return Array.isArray(c.value) && c.value.includes(val);
      case 'contains':
        return String(val).includes(String(c.value));
      case 'gt':
        return Number(val) > Number(c.value);
      case 'gte':
        return Number(val) >= Number(c.value);
      case 'lt':
        return Number(val) < Number(c.value);
      case 'lte':
        return Number(val) <= Number(c.value);
      default:
        return true;
    }
  });
}
