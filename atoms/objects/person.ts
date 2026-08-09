import type { AtomMeta, ObjectAtom, PropertyDef } from '../core.js';

export const PersonMeta: AtomMeta = {
  id: 2,
  symbol: 'Pe',
  name: 'Person',
  family: 'objects',
  description: 'Human individual.',
};

export const PersonProperties: PropertyDef[] = [
  { key: 'id', type: 'id', required: true },
  { key: 'firstName', type: 'string', required: true },
  { key: 'lastName', type: 'string', required: true },
  { key: 'email', type: 'string', required: true },
  { key: 'phone', type: 'string' },
  { key: 'title', type: 'string' },
  { key: 'companyId', type: 'reference', description: 'Reference to Company' },
  { key: 'createdAt', type: 'datetime', required: true },
  { key: 'updatedAt', type: 'datetime' },
];

export interface Person extends ObjectAtom {
  meta: typeof PersonMeta;
  properties: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    phone?: string;
    title?: string;
    companyId?: string;
    createdAt: string;
    updatedAt?: string;
  };
}

export function createPerson(input: {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  title?: string;
  companyId?: string;
}): Person {
  const now = new Date().toISOString();
  return {
    meta: PersonMeta,
    id: input.id,
    properties: {
      id: input.id,
      firstName: input.firstName,
      lastName: input.lastName,
      email: input.email,
      phone: input.phone,
      title: input.title,
      companyId: input.companyId,
      createdAt: now,
      updatedAt: now,
    },
  };
}
