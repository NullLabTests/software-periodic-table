import type { AtomMeta, ObjectAtom, PropertyDef } from '../core.js';

export const DealMeta: AtomMeta = {
  id: 5,
  symbol: 'Dl',
  name: 'Deal',
  family: 'objects',
  description: 'Sales opportunity or negotiated agreement.',
};

export const DealProperties: PropertyDef[] = [
  { key: 'id', type: 'id', required: true },
  { key: 'title', type: 'string', required: true },
  { key: 'amount', type: 'currency', required: true },
  { key: 'currency', type: 'string' },
  {
    key: 'stage',
    type: 'enum',
    enumValues: ['prospecting', 'qualification', 'proposal', 'negotiation', 'closed_won', 'closed_lost'],
    required: true,
  },
  { key: 'owner', type: 'reference', description: 'User id' },
  { key: 'accountId', type: 'reference', description: 'Reference to Account' },
  { key: 'contactId', type: 'reference', description: 'Reference to Contact' },
  { key: 'expectedCloseDate', type: 'date' },
  { key: 'probability', type: 'number' },
  { key: 'createdAt', type: 'datetime', required: true },
  { key: 'updatedAt', type: 'datetime' },
];

export interface Deal extends ObjectAtom {
  meta: typeof DealMeta;
  properties: {
    id: string;
    title: string;
    amount: number;
    currency?: string;
    stage: 'prospecting' | 'qualification' | 'proposal' | 'negotiation' | 'closed_won' | 'closed_lost';
    owner?: string;
    accountId?: string;
    contactId?: string;
    expectedCloseDate?: string;
    probability?: number;
    createdAt: string;
    updatedAt?: string;
  };
}

export function createDeal(input: {
  id: string;
  title: string;
  amount: number;
  currency?: string;
  stage?: Deal['properties']['stage'];
  owner?: string;
  accountId?: string;
  contactId?: string;
  expectedCloseDate?: string;
  probability?: number;
}): Deal {
  const now = new Date().toISOString();
  return {
    meta: DealMeta,
    id: input.id,
    properties: {
      id: input.id,
      title: input.title,
      amount: input.amount,
      currency: input.currency,
      stage: input.stage ?? 'prospecting',
      owner: input.owner,
      accountId: input.accountId,
      contactId: input.contactId,
      expectedCloseDate: input.expectedCloseDate,
      probability: input.probability,
      createdAt: now,
      updatedAt: now,
    },
  };
}
