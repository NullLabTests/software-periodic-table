import type { AtomMeta, ObjectAtom, PropertyDef } from '../core.js';

export const TagMeta: AtomMeta = {
  id: 33,
  symbol: 'Tg',
  name: 'Tag',
  family: 'objects',
  description: 'Lightweight label.',
};

export const TagProperties: PropertyDef[] = [
  { key: 'id', type: 'id', required: true },
  { key: 'name', type: 'string', required: true },
  { key: 'color', type: 'string' },
  { key: 'entityType', type: 'string', description: 'Type of entity this tags' },
  { key: 'createdAt', type: 'datetime', required: true },
  { key: 'updatedAt', type: 'datetime' },
];

export interface Tag extends ObjectAtom {
  meta: typeof TagMeta;
  properties: {
    id: string;
    name: string;
    color?: string;
    entityType?: string;
    createdAt: string;
    updatedAt?: string;
  };
}

export function createTag(input: { id: string; name: string; color?: string; entityType?: string }): Tag {
  const now = new Date().toISOString();
  return {
    meta: TagMeta,
    id: input.id,
    properties: {
      id: input.id,
      name: input.name,
      color: input.color,
      entityType: input.entityType,
      createdAt: now,
      updatedAt: now,
    },
  };
}
