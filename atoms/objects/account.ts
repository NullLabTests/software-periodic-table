import type { AtomMeta, ObjectAtom, PropertyDef } from '../core.js';

export const AccountMeta: AtomMeta = {
  id: 6,
  symbol: 'Ac',
  name: 'Account',
  family: 'objects',
  description: 'Customer or organizational account.',
};

export const AccountProperties: PropertyDef[] = [
  { key: 'id', type: 'id', required: true },
  { key: 'name', type: 'string', required: true },
  { key: 'type', type: 'enum', enumValues: ['customer', 'prospect', 'partner', 'internal'], required: true },
  { key: 'industry', type: 'string' },
  { key: 'website', type: 'string' },
  { key: 'phone', type: 'string' },
  { key: 'billingAddress', type: 'string' },
  { key: 'owner', type: 'reference', description: 'User id' },
  { key: 'status', type: 'enum', enumValues: ['active', 'inactive'], required: true },
  { key: 'createdAt', type: 'datetime', required: true },
  { key: 'updatedAt', type: 'datetime' },
];

export interface Account extends ObjectAtom {
  meta: typeof AccountMeta;
  properties: {
    id: string;
    name: string;
    type: 'customer' | 'prospect' | 'partner' | 'internal';
    industry?: string;
    website?: string;
    phone?: string;
    billingAddress?: string;
    owner?: string;
    status: 'active' | 'inactive';
    createdAt: string;
    updatedAt?: string;
  };
}

export function createAccount(input: {
  id: string;
  name: string;
  type?: Account['properties']['type'];
  industry?: string;
  website?: string;
  phone?: string;
  billingAddress?: string;
  owner?: string;
}): Account {
  const now = new Date().toISOString();
  return {
    meta: AccountMeta,
    id: input.id,
    properties: {
      id: input.id,
      name: input.name,
      type: input.type ?? 'customer',
      industry: input.industry,
      website: input.website,
      phone: input.phone,
      billingAddress: input.billingAddress,
      owner: input.owner,
      status: 'active',
      createdAt: now,
      updatedAt: now,
    },
  };
}
