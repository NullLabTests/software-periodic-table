import type { AtomMeta, ObjectAtom, PropertyDef } from '../core.js';

export const RoleMeta: AtomMeta = {
  id: 9,
  symbol: 'Ro',
  name: 'Role',
  family: 'objects',
  description: 'Named set of permissions or responsibilities.',
};

export const RoleProperties: PropertyDef[] = [
  { key: 'id', type: 'id', required: true },
  { key: 'name', type: 'string', required: true },
  { key: 'description', type: 'string' },
  { key: 'permissions', type: 'json', description: 'Array of permission keys' },
  { key: 'isSystem', type: 'boolean' },
  { key: 'createdAt', type: 'datetime', required: true },
  { key: 'updatedAt', type: 'datetime' },
];

export interface Role extends ObjectAtom {
  meta: typeof RoleMeta;
  properties: {
    id: string;
    name: string;
    description?: string;
    permissions?: string[];
    isSystem?: boolean;
    createdAt: string;
    updatedAt?: string;
  };
}

export function createRole(input: {
  id: string;
  name: string;
  description?: string;
  permissions?: string[];
  isSystem?: boolean;
}): Role {
  const now = new Date().toISOString();
  return {
    meta: RoleMeta,
    id: input.id,
    properties: {
      id: input.id,
      name: input.name,
      description: input.description,
      permissions: input.permissions,
      isSystem: input.isSystem,
      createdAt: now,
      updatedAt: now,
    },
  };
}
