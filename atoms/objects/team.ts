import type { AtomMeta, ObjectAtom, PropertyDef } from '../core.js';

export const TeamMeta: AtomMeta = {
  id: 8,
  symbol: 'Tm',
  name: 'Team',
  family: 'objects',
  description: 'Group of users with shared context.',
};

export const TeamProperties: PropertyDef[] = [
  { key: 'id', type: 'id', required: true },
  { key: 'name', type: 'string', required: true },
  { key: 'description', type: 'string' },
  { key: 'memberIds', type: 'json', description: 'Array of User ids' },
  { key: 'owner', type: 'reference', description: 'User id' },
  { key: 'createdAt', type: 'datetime', required: true },
  { key: 'updatedAt', type: 'datetime' },
];

export interface Team extends ObjectAtom {
  meta: typeof TeamMeta;
  properties: {
    id: string;
    name: string;
    description?: string;
    memberIds?: string[];
    owner?: string;
    createdAt: string;
    updatedAt?: string;
  };
}

export function createTeam(input: {
  id: string;
  name: string;
  description?: string;
  memberIds?: string[];
  owner?: string;
}): Team {
  const now = new Date().toISOString();
  return {
    meta: TeamMeta,
    id: input.id,
    properties: {
      id: input.id,
      name: input.name,
      description: input.description,
      memberIds: input.memberIds,
      owner: input.owner,
      createdAt: now,
      updatedAt: now,
    },
  };
}
