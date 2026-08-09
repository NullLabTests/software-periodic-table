import type { AtomMeta, ObjectAtom, PropertyDef } from '../core.js';

export const EmailMeta: AtomMeta = {
  id: 28,
  symbol: 'Em',
  name: 'Email',
  family: 'objects',
  description: 'Email message.',
};

export const EmailProperties: PropertyDef[] = [
  { key: 'id', type: 'id', required: true },
  { key: 'to', type: 'string', required: true },
  { key: 'from', type: 'string', required: true },
  { key: 'subject', type: 'string', required: true },
  { key: 'body', type: 'string' },
  { key: 'cc', type: 'json', description: 'Array of email addresses' },
  { key: 'bcc', type: 'json', description: 'Array of email addresses' },
  { key: 'attachments', type: 'json', description: 'Array of File ids' },
  { key: 'status', type: 'enum', enumValues: ['draft', 'queued', 'sent', 'failed', 'bounced'], required: true },
  { key: 'sentAt', type: 'datetime' },
  { key: 'createdAt', type: 'datetime', required: true },
];

export interface Email extends ObjectAtom {
  meta: typeof EmailMeta;
  properties: {
    id: string;
    to: string;
    from: string;
    subject: string;
    body?: string;
    cc?: string[];
    bcc?: string[];
    attachments?: string[];
    status: 'draft' | 'queued' | 'sent' | 'failed' | 'bounced';
    sentAt?: string;
    createdAt: string;
  };
}

export function createEmail(input: {
  id: string;
  to: string;
  from: string;
  subject: string;
  body?: string;
  cc?: string[];
  bcc?: string[];
  attachments?: string[];
  status?: Email['properties']['status'];
  sentAt?: string;
}): Email {
  return {
    meta: EmailMeta,
    id: input.id,
    properties: {
      id: input.id,
      to: input.to,
      from: input.from,
      subject: input.subject,
      body: input.body,
      cc: input.cc,
      bcc: input.bcc,
      attachments: input.attachments,
      status: input.status ?? 'draft',
      sentAt: input.sentAt,
      createdAt: new Date().toISOString(),
    },
  };
}
