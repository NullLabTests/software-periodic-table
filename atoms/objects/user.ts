import type { AtomMeta, ObjectAtom, PropertyDef } from '../core.js';

export const UserMeta: AtomMeta = {
  id: 7,
  symbol: 'Us',
  name: 'User',
  family: 'objects',
  description: 'Authenticated system user.',
};

export const UserProperties: PropertyDef[] = [
  { key: 'id', type: 'id', required: true },
  { key: 'email', type: 'string', required: true },
  { key: 'name', type: 'string', required: true },
  { key: 'role', type: 'reference', description: 'Reference to Role atom' },
  { key: 'status', type: 'enum', enumValues: ['active', 'invited', 'disabled'] },
  { key: 'createdAt', type: 'datetime', required: true },
  { key: 'updatedAt', type: 'datetime' },
];

export interface User extends ObjectAtom {
  meta: typeof UserMeta;
  properties: {
    id: string;
    email: string;
    name: string;
    role?: string;
    status: 'active' | 'invited' | 'disabled';
    createdAt: string;
    updatedAt?: string;
  };
}

export function createUser(input: { id: string; email: string; name: string; role?: string }): User {
  const now = new Date().toISOString();
  return {
    meta: UserMeta,
    id: input.id,
    properties: {
      id: input.id,
      email: input.email,
      name: input.name,
      role: input.role,
      status: 'active',
      createdAt: now,
      updatedAt: now,
    },
  };
}
