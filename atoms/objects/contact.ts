import type { AtomMeta, ObjectAtom, PropertyDef } from '../core.js';

export const ContactMeta: AtomMeta = {
  id: 3,
  symbol: 'Ct',
  name: 'Contact',
  family: 'objects',
  description: 'Reachable person or entity record.',
};

export const ContactProperties: PropertyDef[] = [
  { key: 'id', type: 'id', required: true },
  { key: 'firstName', type: 'string', required: true },
  { key: 'lastName', type: 'string', required: true },
  { key: 'email', type: 'string' },
  { key: 'phone', type: 'string' },
  { key: 'companyId', type: 'reference', description: 'Reference to Company' },
  { key: 'role', type: 'string' },
  { key: 'status', type: 'enum', enumValues: ['active', 'inactive', 'lead'], required: true },
  { key: 'createdAt', type: 'datetime', required: true },
  { key: 'updatedAt', type: 'datetime' },
];

export interface Contact extends ObjectAtom {
  meta: typeof ContactMeta;
  properties: {
    id: string;
    firstName: string;
    lastName: string;
    email?: string;
    phone?: string;
    companyId?: string;
    role?: string;
    status: 'active' | 'inactive' | 'lead';
    createdAt: string;
    updatedAt?: string;
  };
}

export function createContact(input: {
  id: string;
  firstName: string;
  lastName: string;
  email?: string;
  phone?: string;
  companyId?: string;
  role?: string;
  status?: Contact['properties']['status'];
}): Contact {
  const now = new Date().toISOString();
  return {
    meta: ContactMeta,
    id: input.id,
    properties: {
      id: input.id,
      firstName: input.firstName,
      lastName: input.lastName,
      email: input.email,
      phone: input.phone,
      companyId: input.companyId,
      role: input.role,
      status: input.status ?? 'active',
      createdAt: now,
      updatedAt: now,
    },
  };
}
