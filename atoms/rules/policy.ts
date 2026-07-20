import type { AtomMeta } from '../core.js';

export const PolicyMeta: AtomMeta = {
  id: 110,
  symbol: 'Po',
  name: 'Policy',
  family: 'rules',
  description: 'Governed rule set.',
};

export interface PolicyStatement {
  id: string;
  name: string;
  effect: 'allow' | 'deny';
  actions: string[];
  resources: string[];
  conditions?: string[];
  priority?: number;
}

export interface Policy {
  id: string;
  name: string;
  statements: PolicyStatement[];
  enabled: boolean;
}

export function createPolicy(opts: {
  id: string;
  name: string;
  statements: PolicyStatement[];
  enabled?: boolean;
}): Policy {
  return {
    id: opts.id,
    name: opts.name,
    statements: opts.statements,
    enabled: opts.enabled ?? true,
  };
}

export function evaluatePolicy(
  policy: Policy,
  action: string,
  resource: string,
): { allowed: boolean; matchedStatement?: string } {
  for (const stmt of policy.statements) {
    if (!stmt.actions.includes(action) && stmt.actions[0] !== '*') continue;
    if (!stmt.resources.includes(resource) && stmt.resources[0] !== '*') continue;
    return {
      allowed: stmt.effect === 'allow',
      matchedStatement: stmt.name,
    };
  }
  return { allowed: false };
}
