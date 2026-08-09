import type { AtomMeta, ObjectAtom, PropertyDef } from '../core.js';

export const VendorMeta: AtomMeta = {
  id: 35,
  symbol: 'Vn',
  name: 'Vendor',
  family: 'objects',
  description: 'External supplier or partner.',
};

export const VendorProperties: PropertyDef[] = [
  { key: 'id', type: 'id', required: true },
  { key: 'name', type: 'string', required: true },
  { key: 'contactName', type: 'string' },
  { key: 'email', type: 'string' },
  { key: 'phone', type: 'string' },
  { key: 'website', type: 'string' },
  { key: 'status', type: 'enum', enumValues: ['active', 'inactive', 'onboarding', 'blacklisted'], required: true },
  { key: 'paymentTerms', type: 'string' },
  { key: 'createdAt', type: 'datetime', required: true },
  { key: 'updatedAt', type: 'datetime' },
];

export interface Vendor extends ObjectAtom {
  meta: typeof VendorMeta;
  properties: {
    id: string;
    name: string;
    contactName?: string;
    email?: string;
    phone?: string;
    website?: string;
    status: 'active' | 'inactive' | 'onboarding' | 'blacklisted';
    paymentTerms?: string;
    createdAt: string;
    updatedAt?: string;
  };
}

export function createVendor(input: {
  id: string;
  name: string;
  contactName?: string;
  email?: string;
  phone?: string;
  website?: string;
  paymentTerms?: string;
}): Vendor {
  const now = new Date().toISOString();
  return {
    meta: VendorMeta,
    id: input.id,
    properties: {
      id: input.id,
      name: input.name,
      contactName: input.contactName,
      email: input.email,
      phone: input.phone,
      website: input.website,
      status: 'active',
      paymentTerms: input.paymentTerms,
      createdAt: now,
      updatedAt: now,
    },
  };
}
