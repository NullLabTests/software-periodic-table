import type { AtomMeta, ObjectAtom, PropertyDef } from '../core.js';

export const MessageMeta: AtomMeta = {
  id: 27,
  symbol: 'Ms',
  name: 'Message',
  family: 'objects',
  description: 'Communication unit.',
};

export const MessageProperties: PropertyDef[] = [
  { key: 'id', type: 'id', required: true },
  { key: 'body', type: 'string', required: true },
  { key: 'senderId', type: 'reference', description: 'User id', required: true },
  { key: 'channel', type: 'enum', enumValues: ['in_app', 'sms', 'push', 'slack', 'other'], required: true },
  { key: 'threadId', type: 'reference', description: 'Parent message id' },
  { key: 'recipientIds', type: 'json', description: 'Array of User ids' },
  { key: 'readBy', type: 'json', description: 'Array of User ids' },
  { key: 'sentAt', type: 'datetime', required: true },
];

export interface Message extends ObjectAtom {
  meta: typeof MessageMeta;
  properties: {
    id: string;
    body: string;
    senderId: string;
    channel: 'in_app' | 'sms' | 'push' | 'slack' | 'other';
    threadId?: string;
    recipientIds?: string[];
    readBy?: string[];
    sentAt: string;
  };
}

export function createMessage(input: {
  id: string;
  body: string;
  senderId: string;
  channel?: Message['properties']['channel'];
  threadId?: string;
  recipientIds?: string[];
  sentAt?: string;
}): Message {
  return {
    meta: MessageMeta,
    id: input.id,
    properties: {
      id: input.id,
      body: input.body,
      senderId: input.senderId,
      channel: input.channel ?? 'in_app',
      threadId: input.threadId,
      recipientIds: input.recipientIds,
      sentAt: input.sentAt ?? new Date().toISOString(),
    },
  };
}
