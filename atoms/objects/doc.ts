import type { AtomMeta, ObjectAtom, PropertyDef } from '../core.js';

export const DocMeta: AtomMeta = {
  id: 16,
  symbol: 'Dc',
  name: 'Doc',
  family: 'objects',
  description: 'Document or structured content.',
};

export const DocProperties: PropertyDef[] = [
  { key: 'id', type: 'id', required: true },
  { key: 'title', type: 'string', required: true },
  { key: 'body', type: 'string' },
  { key: 'format', type: 'enum', enumValues: ['markdown', 'html', 'plain', 'json'], required: true },
  { key: 'authorId', type: 'reference', description: 'User id' },
  { key: 'folderId', type: 'reference' },
  { key: 'status', type: 'enum', enumValues: ['draft', 'published', 'archived'], required: true },
  { key: 'createdAt', type: 'datetime', required: true },
  { key: 'updatedAt', type: 'datetime' },
];

export interface Doc extends ObjectAtom {
  meta: typeof DocMeta;
  properties: {
    id: string;
    title: string;
    body?: string;
    format: 'markdown' | 'html' | 'plain' | 'json';
    authorId?: string;
    folderId?: string;
    status: 'draft' | 'published' | 'archived';
    createdAt: string;
    updatedAt?: string;
  };
}

export function createDoc(input: {
  id: string;
  title: string;
  body?: string;
  format?: Doc['properties']['format'];
  authorId?: string;
  folderId?: string;
}): Doc {
  const now = new Date().toISOString();
  return {
    meta: DocMeta,
    id: input.id,
    properties: {
      id: input.id,
      title: input.title,
      body: input.body,
      format: input.format ?? 'markdown',
      authorId: input.authorId,
      folderId: input.folderId,
      status: 'draft',
      createdAt: now,
      updatedAt: now,
    },
  };
}
