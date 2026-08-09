import type { AtomMeta, ObjectAtom, PropertyDef } from '../core.js';

export const NoteMeta: AtomMeta = {
  id: 18,
  symbol: 'Nt',
  name: 'Note',
  family: 'objects',
  description: 'Free-form annotation or comment.',
};

export const NoteProperties: PropertyDef[] = [
  { key: 'id', type: 'id', required: true },
  { key: 'body', type: 'string', required: true },
  { key: 'authorId', type: 'reference', description: 'User id' },
  { key: 'entityType', type: 'string', description: 'Type of referenced entity' },
  { key: 'entityId', type: 'reference', description: 'Referenced entity id' },
  { key: 'pinned', type: 'boolean' },
  { key: 'createdAt', type: 'datetime', required: true },
  { key: 'updatedAt', type: 'datetime' },
];

export interface Note extends ObjectAtom {
  meta: typeof NoteMeta;
  properties: {
    id: string;
    body: string;
    authorId?: string;
    entityType?: string;
    entityId?: string;
    pinned?: boolean;
    createdAt: string;
    updatedAt?: string;
  };
}

export function createNote(input: {
  id: string;
  body: string;
  authorId?: string;
  entityType?: string;
  entityId?: string;
  pinned?: boolean;
}): Note {
  const now = new Date().toISOString();
  return {
    meta: NoteMeta,
    id: input.id,
    properties: {
      id: input.id,
      body: input.body,
      authorId: input.authorId,
      entityType: input.entityType,
      entityId: input.entityId,
      pinned: input.pinned,
      createdAt: now,
      updatedAt: now,
    },
  };
}
