import type { AtomMeta, ObjectAtom, PropertyDef } from '../core.js';

export const ActivityMeta: AtomMeta = {
  id: 30,
  symbol: 'Ay',
  name: 'Activity',
  family: 'objects',
  description: 'Logged action or interaction.',
};

export const ActivityProperties: PropertyDef[] = [
  { key: 'id', type: 'id', required: true },
  { key: 'type', type: 'enum', enumValues: ['call', 'email', 'meeting', 'note', 'task'], required: true },
  { key: 'subject', type: 'string', required: true },
  { key: 'description', type: 'string' },
  { key: 'contactId', type: 'reference', description: 'Reference to Contact' },
  { key: 'performedBy', type: 'reference', description: 'User id' },
  { key: 'performedAt', type: 'datetime', required: true },
  { key: 'createdAt', type: 'datetime', required: true },
];

export interface Activity extends ObjectAtom {
  meta: typeof ActivityMeta;
  properties: {
    id: string;
    type: 'call' | 'email' | 'meeting' | 'note' | 'task';
    subject: string;
    description?: string;
    contactId?: string;
    performedBy?: string;
    performedAt: string;
    createdAt: string;
  };
}

export function createActivity(input: {
  id: string;
  type: Activity['properties']['type'];
  subject: string;
  description?: string;
  contactId?: string;
  performedBy?: string;
  performedAt?: string;
}): Activity {
  const now = new Date().toISOString();
  return {
    meta: ActivityMeta,
    id: input.id,
    properties: {
      id: input.id,
      type: input.type,
      subject: input.subject,
      description: input.description,
      contactId: input.contactId,
      performedBy: input.performedBy,
      performedAt: input.performedAt ?? now,
      createdAt: now,
    },
  };
}
