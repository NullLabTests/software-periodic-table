import type { AtomMeta, ObjectAtom, PropertyDef } from '../core.js';

export const PlanMeta: AtomMeta = {
  id: 24,
  symbol: 'Pl',
  name: 'Plan',
  family: 'objects',
  description: 'Pricing or feature tier.',
};

export const PlanProperties: PropertyDef[] = [
  { key: 'id', type: 'id', required: true },
  { key: 'name', type: 'string', required: true },
  { key: 'description', type: 'string' },
  { key: 'price', type: 'currency', required: true },
  { key: 'currency', type: 'string' },
  { key: 'interval', type: 'enum', enumValues: ['monthly', 'quarterly', 'yearly', 'one_time'], required: true },
  { key: 'features', type: 'json', description: 'Array of feature keys' },
  { key: 'limits', type: 'json', description: 'Usage limit map' },
  { key: 'status', type: 'enum', enumValues: ['active', 'archived'], required: true },
  { key: 'createdAt', type: 'datetime', required: true },
  { key: 'updatedAt', type: 'datetime' },
];

export interface Plan extends ObjectAtom {
  meta: typeof PlanMeta;
  properties: {
    id: string;
    name: string;
    description?: string;
    price: number;
    currency?: string;
    interval: 'monthly' | 'quarterly' | 'yearly' | 'one_time';
    features?: string[];
    limits?: Record<string, number>;
    status: 'active' | 'archived';
    createdAt: string;
    updatedAt?: string;
  };
}

export function createPlan(input: {
  id: string;
  name: string;
  description?: string;
  price: number;
  currency?: string;
  interval?: Plan['properties']['interval'];
  features?: string[];
  limits?: Record<string, number>;
}): Plan {
  const now = new Date().toISOString();
  return {
    meta: PlanMeta,
    id: input.id,
    properties: {
      id: input.id,
      name: input.name,
      description: input.description,
      price: input.price,
      currency: input.currency,
      interval: input.interval ?? 'monthly',
      features: input.features,
      limits: input.limits,
      status: 'active',
      createdAt: now,
      updatedAt: now,
    },
  };
}
