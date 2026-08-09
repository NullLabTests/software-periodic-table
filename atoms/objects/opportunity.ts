import type { AtomMeta, ObjectAtom, PropertyDef } from '../core.js';

export const OpportunityMeta: AtomMeta = {
  id: 10,
  symbol: 'Op',
  name: 'Opportunity',
  family: 'objects',
  description: 'Business opportunity.',
};

export const OpportunityProperties: PropertyDef[] = [
  { key: 'id', type: 'id', required: true },
  { key: 'title', type: 'string', required: true },
  { key: 'value', type: 'currency', required: true },
  { key: 'currency', type: 'string' },
  { key: 'stage', type: 'enum', enumValues: ['discovery', 'evaluation', 'proposal', 'won', 'lost'], required: true },
  { key: 'owner', type: 'reference', description: 'User id' },
  { key: 'accountId', type: 'reference', description: 'Reference to Account' },
  { key: 'source', type: 'string' },
  { key: 'closeDate', type: 'date' },
  { key: 'createdAt', type: 'datetime', required: true },
  { key: 'updatedAt', type: 'datetime' },
];

export interface Opportunity extends ObjectAtom {
  meta: typeof OpportunityMeta;
  properties: {
    id: string;
    title: string;
    value: number;
    currency?: string;
    stage: 'discovery' | 'evaluation' | 'proposal' | 'won' | 'lost';
    owner?: string;
    accountId?: string;
    source?: string;
    closeDate?: string;
    createdAt: string;
    updatedAt?: string;
  };
}

export function createOpportunity(input: {
  id: string;
  title: string;
  value: number;
  currency?: string;
  stage?: Opportunity['properties']['stage'];
  owner?: string;
  accountId?: string;
  source?: string;
  closeDate?: string;
}): Opportunity {
  const now = new Date().toISOString();
  return {
    meta: OpportunityMeta,
    id: input.id,
    properties: {
      id: input.id,
      title: input.title,
      value: input.value,
      currency: input.currency,
      stage: input.stage ?? 'discovery',
      owner: input.owner,
      accountId: input.accountId,
      source: input.source,
      closeDate: input.closeDate,
      createdAt: now,
      updatedAt: now,
    },
  };
}
