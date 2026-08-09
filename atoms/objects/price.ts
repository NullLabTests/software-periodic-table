import type { AtomMeta, ObjectAtom, PropertyDef } from '../core.js';

export const PriceMeta: AtomMeta = {
  id: 25,
  symbol: 'Px',
  name: 'Price',
  family: 'objects',
  description: 'Monetary value of an offering.',
};

export const PriceProperties: PropertyDef[] = [
  { key: 'id', type: 'id', required: true },
  { key: 'amount', type: 'currency', required: true },
  { key: 'currency', type: 'string', required: true },
  { key: 'objectType', type: 'string', description: 'Reference to Product or Service', required: true },
  { key: 'objectId', type: 'reference', required: true },
  { key: 'tier', type: 'enum', enumValues: ['list', 'sale', 'bulk', 'contract'], required: true },
  { key: 'validFrom', type: 'date' },
  { key: 'validTo', type: 'date' },
  { key: 'createdAt', type: 'datetime', required: true },
  { key: 'updatedAt', type: 'datetime' },
];

export interface Price extends ObjectAtom {
  meta: typeof PriceMeta;
  properties: {
    id: string;
    amount: number;
    currency: string;
    objectType: string;
    objectId: string;
    tier: 'list' | 'sale' | 'bulk' | 'contract';
    validFrom?: string;
    validTo?: string;
    createdAt: string;
    updatedAt?: string;
  };
}

export function createPrice(input: {
  id: string;
  amount: number;
  currency: string;
  objectType: string;
  objectId: string;
  tier?: Price['properties']['tier'];
  validFrom?: string;
  validTo?: string;
}): Price {
  const now = new Date().toISOString();
  return {
    meta: PriceMeta,
    id: input.id,
    properties: {
      id: input.id,
      amount: input.amount,
      currency: input.currency,
      objectType: input.objectType,
      objectId: input.objectId,
      tier: input.tier ?? 'list',
      validFrom: input.validFrom,
      validTo: input.validTo,
      createdAt: now,
      updatedAt: now,
    },
  };
}
