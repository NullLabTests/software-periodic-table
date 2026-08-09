import type { AtomMeta, ObjectAtom, PropertyDef } from '../core.js';

export const ServiceMeta: AtomMeta = {
  id: 12,
  symbol: 'Sv',
  name: 'Service',
  family: 'objects',
  description: 'Deliverable service offering.',
};

export const ServiceProperties: PropertyDef[] = [
  { key: 'id', type: 'id', required: true },
  { key: 'name', type: 'string', required: true },
  { key: 'description', type: 'string' },
  { key: 'category', type: 'string' },
  { key: 'price', type: 'currency' },
  { key: 'currency', type: 'string' },
  { key: 'durationMinutes', type: 'number' },
  { key: 'status', type: 'enum', enumValues: ['active', 'inactive', 'discontinued'], required: true },
  { key: 'createdAt', type: 'datetime', required: true },
  { key: 'updatedAt', type: 'datetime' },
];

export interface Service extends ObjectAtom {
  meta: typeof ServiceMeta;
  properties: {
    id: string;
    name: string;
    description?: string;
    category?: string;
    price?: number;
    currency?: string;
    durationMinutes?: number;
    status: 'active' | 'inactive' | 'discontinued';
    createdAt: string;
    updatedAt?: string;
  };
}

export function createService(input: {
  id: string;
  name: string;
  description?: string;
  category?: string;
  price?: number;
  currency?: string;
  durationMinutes?: number;
}): Service {
  const now = new Date().toISOString();
  return {
    meta: ServiceMeta,
    id: input.id,
    properties: {
      id: input.id,
      name: input.name,
      description: input.description,
      category: input.category,
      price: input.price,
      currency: input.currency,
      durationMinutes: input.durationMinutes,
      status: 'active',
      createdAt: now,
      updatedAt: now,
    },
  };
}
