import type { AtomMeta, ObjectAtom, PropertyDef } from '../core.js';

export const CompanyMeta: AtomMeta = {
  id: 1,
  symbol: 'Co',
  name: 'Company',
  family: 'objects',
  description: 'Organization or legal entity.',
};

export const CompanyProperties: PropertyDef[] = [
  { key: 'id', type: 'id', required: true },
  { key: 'name', type: 'string', required: true },
  { key: 'industry', type: 'string' },
  { key: 'website', type: 'string' },
  { key: 'phone', type: 'string' },
  { key: 'address', type: 'string' },
  { key: 'status', type: 'enum', enumValues: ['active', 'inactive', 'lead'], required: true },
  { key: 'createdAt', type: 'datetime', required: true },
  { key: 'updatedAt', type: 'datetime' },
];

export interface Company extends ObjectAtom {
  meta: typeof CompanyMeta;
  properties: {
    id: string;
    name: string;
    industry?: string;
    website?: string;
    phone?: string;
    address?: string;
    status: 'active' | 'inactive' | 'lead';
    createdAt: string;
    updatedAt?: string;
  };
}

export function createCompany(input: {
  id: string;
  name: string;
  industry?: string;
  website?: string;
  phone?: string;
  address?: string;
  status?: Company['properties']['status'];
}): Company {
  const now = new Date().toISOString();
  return {
    meta: CompanyMeta,
    id: input.id,
    properties: {
      id: input.id,
      name: input.name,
      industry: input.industry,
      website: input.website,
      phone: input.phone,
      address: input.address,
      status: input.status ?? 'active',
      createdAt: now,
      updatedAt: now,
    },
  };
}
