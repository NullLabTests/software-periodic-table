import type { AtomMeta, ObjectAtom, PropertyDef } from '../core.js';

export const FileMeta: AtomMeta = {
  id: 17,
  symbol: 'Fl',
  name: 'File',
  family: 'objects',
  description: 'Binary or unstructured file.',
};

export const FileProperties: PropertyDef[] = [
  { key: 'id', type: 'id', required: true },
  { key: 'name', type: 'string', required: true },
  { key: 'mimeType', type: 'string', required: true },
  { key: 'sizeBytes', type: 'number', required: true },
  { key: 'storageKey', type: 'string', required: true },
  { key: 'uploadedBy', type: 'reference', description: 'User id' },
  { key: 'parentId', type: 'reference', description: 'Containing object id' },
  { key: 'metadata', type: 'json' },
  { key: 'createdAt', type: 'datetime', required: true },
];

export interface File extends ObjectAtom {
  meta: typeof FileMeta;
  properties: {
    id: string;
    name: string;
    mimeType: string;
    sizeBytes: number;
    storageKey: string;
    uploadedBy?: string;
    parentId?: string;
    metadata?: Record<string, unknown>;
    createdAt: string;
  };
}

export function createFile(input: {
  id: string;
  name: string;
  mimeType: string;
  sizeBytes: number;
  storageKey: string;
  uploadedBy?: string;
  parentId?: string;
  metadata?: Record<string, unknown>;
}): File {
  return {
    meta: FileMeta,
    id: input.id,
    properties: {
      id: input.id,
      name: input.name,
      mimeType: input.mimeType,
      sizeBytes: input.sizeBytes,
      storageKey: input.storageKey,
      uploadedBy: input.uploadedBy,
      parentId: input.parentId,
      metadata: input.metadata,
      createdAt: new Date().toISOString(),
    },
  };
}
